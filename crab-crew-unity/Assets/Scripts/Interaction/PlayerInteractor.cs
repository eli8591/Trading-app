using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace CrabCrew.Interaction
{
    /// <summary>
    /// Put this on the player root (the object with the CharacterController / movement script).
    /// Each frame it looks through the centre of the camera, finds what the player is aiming at,
    /// and handles E to pick up / drop and left mouse to throw.
    /// </summary>
    public class PlayerInteractor : MonoBehaviour
    {
        [Header("References")]
        [Tooltip("First-person camera. Left empty, uses a child camera or Camera.main.")]
        [SerializeField] private Camera playerCamera;

        [Tooltip("Empty child of the camera where carried objects float. " +
                 "Left empty, one is created 1.5 m in front of the camera.")]
        [SerializeField] private Transform holdPoint;

        [Header("Looking")]
        [Tooltip("How far away (metres) the player can reach objects.")]
        [SerializeField] private float reach = 3f;

        [Tooltip("Layers the look ray can hit. Leave on Everything unless you need to exclude something.")]
        [SerializeField] private LayerMask interactMask = ~0;

        [Header("Carrying")]
        [Tooltip("Objects with a Rigidbody mass above this can't be picked up.")]
        [SerializeField] private float maxCarryMass = 25f;

        [Tooltip("How quickly the object catches up to the hold point. Higher is snappier.")]
        [SerializeField] private float followStrength = 15f;

        [Tooltip("Top speed (m/s) the carried object can move while following.")]
        [SerializeField] private float maxFollowSpeed = 12f;

        [Tooltip("How quickly the object turns to match the hold point's rotation.")]
        [SerializeField] private float rotateSpeed = 10f;

        [Tooltip("If the object gets stuck this far (metres) from the hold point, it's dropped.")]
        [SerializeField] private float breakDistance = 2f;

        [Header("Throwing")]
        [Tooltip("Impulse applied on throw. Heavier objects travel less far.")]
        [SerializeField] private float throwImpulse = 10f;

        public Pickupable HeldObject { get; private set; }
        public IInteractable CurrentTarget { get; private set; }
        public string CurrentPrompt { get; private set; } = string.Empty;
        public float MaxCarryMass => maxCarryMass;
        public Camera PlayerCamera => playerCamera;

        private Collider[] _ownColliders;
        private readonly RaycastHit[] _hits = new RaycastHit[16];

        private void Awake()
        {
            if (playerCamera == null) playerCamera = GetComponentInChildren<Camera>();
            if (playerCamera == null) playerCamera = Camera.main;

            if (holdPoint == null && playerCamera != null)
            {
                holdPoint = new GameObject("HoldPoint").transform;
                holdPoint.SetParent(playerCamera.transform, false);
                holdPoint.localPosition = new Vector3(0f, -0.3f, 1.5f);
            }

            // CharacterController counts as a Collider, so it's included here.
            _ownColliders = GetComponentsInChildren<Collider>();
        }

        private void OnDisable()
        {
            Drop();
        }

        private void Update()
        {
            if (playerCamera == null) return;

            UpdateTarget();

            if (HeldObject != null)
            {
                // Looking at a station that accepts the carried item (e.g. a shop counter):
                // E uses the station. Otherwise E drops.
                bool useStation = CurrentTarget != null
                                  && !(CurrentTarget is Pickupable)
                                  && CurrentTarget.CanInteract(this);

                CurrentPrompt = useStation
                    ? CurrentTarget.GetPrompt(this)
                    : $"[E] Drop {HeldObject.DisplayName}   [LMB] Throw";

                if (InteractPressed())
                {
                    if (useStation) CurrentTarget.Interact(this);
                    else Drop();
                }
                else if (ThrowPressed())
                {
                    Throw();
                }
                return;
            }

            if (InteractPressed() && CurrentTarget != null && CurrentTarget.CanInteract(this))
            {
                CurrentTarget.Interact(this);
            }
        }

        private void FixedUpdate()
        {
            if (HeldObject != null) MoveHeldObject();
        }

        // ---------- Public API ----------

        public void PickUp(Pickupable item)
        {
            if (item == null || item.IsHeld || HeldObject != null) return;

            HeldObject = item;
            CurrentTarget = null;
            item.OnPickedUp(this, _ownColliders);
        }

        public void Drop()
        {
            if (HeldObject == null) return;

            var item = HeldObject;
            HeldObject = null;
            item.OnDropped(_ownColliders);
        }

        public void Throw()
        {
            if (HeldObject == null) return;

            var body = HeldObject.Body;
            Drop();
            body.AddForce(playerCamera.transform.forward * throwImpulse, ForceMode.Impulse);
        }

        // ---------- Internals ----------

        private void UpdateTarget()
        {
            CurrentTarget = null;
            CurrentPrompt = string.Empty;

            Ray ray = playerCamera.ViewportPointToRay(new Vector3(0.5f, 0.5f, 0f));
            int count = Physics.RaycastNonAlloc(ray, _hits, reach, interactMask, QueryTriggerInteraction.Ignore);

            // Nearest hit that isn't the object we're carrying (it floats right in front of the camera).
            Collider nearest = null;
            float nearestDistance = float.MaxValue;
            for (int i = 0; i < count; i++)
            {
                Collider col = _hits[i].collider;
                if (HeldObject != null && col.attachedRigidbody == HeldObject.Body) continue;
                if (col.transform.IsChildOf(transform)) continue; // the player's own body
                if (_hits[i].distance < nearestDistance)
                {
                    nearest = col;
                    nearestDistance = _hits[i].distance;
                }
            }
            if (nearest == null) return;

            // GetComponentInParent lets you put the collider on a child mesh.
            var interactable = nearest.GetComponentInParent<IInteractable>();
            if (interactable == null) return;

            CurrentTarget = interactable;
            CurrentPrompt = interactable.GetPrompt(this);
        }

        private void MoveHeldObject()
        {
            Rigidbody body = HeldObject.Body;
            Vector3 toTarget = holdPoint.position - body.position;

            // Wedged behind a wall or railing: let go rather than yanking it through.
            if (toTarget.magnitude > breakDistance)
            {
                Drop();
                return;
            }

            Vector3 velocity = Vector3.ClampMagnitude(toTarget * followStrength, maxFollowSpeed);
            RigidbodyCompat.SetVelocity(body, velocity);

            Quaternion targetRotation = holdPoint.rotation * HeldObject.HoldRotationOffset;
            body.MoveRotation(Quaternion.Slerp(body.rotation, targetRotation, rotateSpeed * Time.fixedDeltaTime));
            body.angularVelocity = Vector3.zero;
        }

        // Works with both the new Input System package and the old Input Manager.
        private static bool InteractPressed()
        {
#if ENABLE_INPUT_SYSTEM
            bool key = Keyboard.current != null && Keyboard.current.eKey.wasPressedThisFrame;
            bool pad = Gamepad.current != null && Gamepad.current.buttonWest.wasPressedThisFrame;
            return key || pad;
#else
            return Input.GetKeyDown(KeyCode.E);
#endif
        }

        private static bool ThrowPressed()
        {
#if ENABLE_INPUT_SYSTEM
            bool mouse = Mouse.current != null && Mouse.current.leftButton.wasPressedThisFrame;
            bool pad = Gamepad.current != null && Gamepad.current.rightTrigger.wasPressedThisFrame;
            return mouse || pad;
#else
            return Input.GetMouseButtonDown(0);
#endif
        }

        private void OnDrawGizmosSelected()
        {
            Camera cam = playerCamera != null ? playerCamera : GetComponentInChildren<Camera>();
            if (cam == null) return;
            Gizmos.color = Color.cyan;
            Gizmos.DrawRay(cam.transform.position, cam.transform.forward * reach);
        }
    }
}

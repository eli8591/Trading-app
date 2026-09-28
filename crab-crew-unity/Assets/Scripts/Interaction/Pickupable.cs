using System.Collections;
using UnityEngine;

namespace CrabCrew.Interaction
{
    /// <summary>
    /// Put this on any physical object the player can pick up and carry:
    /// crab traps, crates, buckets, fuel cans, oyster bags.
    /// Needs a Rigidbody and at least one Collider (on this object or its children).
    /// </summary>
    [RequireComponent(typeof(Rigidbody))]
    [DisallowMultipleComponent]
    public class Pickupable : MonoBehaviour, IInteractable
    {
        [Tooltip("Name shown in the on-screen prompt, e.g. \"Crab Trap\".")]
        [SerializeField] private string displayName = "Crab Trap";

        [Tooltip("Extra rotation applied while carried, relative to the hold point. " +
                 "Use it to make a trap sit upright or a crate face forward.")]
        [SerializeField] private Vector3 holdRotationOffset = Vector3.zero;

        [Tooltip("Seconds after dropping before the object collides with the player again. " +
                 "Stops it from shoving the player when released at their feet.")]
        [SerializeField] private float recollideDelay = 0.3f;

        public Rigidbody Body { get; private set; }
        public PlayerInteractor Holder { get; private set; }
        public bool IsHeld => Holder != null;
        public string DisplayName => displayName;
        public Quaternion HoldRotationOffset => Quaternion.Euler(holdRotationOffset);

        private Collider[] _colliders;
        private Coroutine _recollideRoutine;

        // Physics settings saved on pickup and restored on drop.
        private bool _savedUseGravity;
        private float _savedLinearDamping;
        private float _savedAngularDamping;
        private RigidbodyInterpolation _savedInterpolation;
        private CollisionDetectionMode _savedCollisionMode;

        private void Awake()
        {
            Body = GetComponent<Rigidbody>();
            _colliders = GetComponentsInChildren<Collider>();
        }

        private void OnDisable()
        {
            // If a held object is destroyed or disabled (sold, dumped into a bin), release it cleanly.
            if (Holder != null)
            {
                Holder.Drop();
            }
        }

        // ---------- IInteractable ----------

        public string GetPrompt(PlayerInteractor interactor)
        {
            if (IsHeld) return string.Empty;
            if (Body.mass > interactor.MaxCarryMass) return $"{displayName} is too heavy to carry";
            return $"[E] Pick up {displayName}";
        }

        public bool CanInteract(PlayerInteractor interactor)
        {
            return !IsHeld
                   && interactor.HeldObject == null
                   && Body.mass <= interactor.MaxCarryMass;
        }

        public void Interact(PlayerInteractor interactor)
        {
            interactor.PickUp(this);
        }

        // ---------- Called by PlayerInteractor ----------

        internal void OnPickedUp(PlayerInteractor holder, Collider[] holderColliders)
        {
            Holder = holder;

            if (_recollideRoutine != null)
            {
                StopCoroutine(_recollideRoutine);
                _recollideRoutine = null;
            }

            _savedUseGravity = Body.useGravity;
            _savedLinearDamping = RigidbodyCompat.GetLinearDamping(Body);
            _savedAngularDamping = RigidbodyCompat.GetAngularDamping(Body);
            _savedInterpolation = Body.interpolation;
            _savedCollisionMode = Body.collisionDetectionMode;

            // Stays a real physics body while carried, so it bumps into walls
            // and boat railings instead of clipping through them.
            Body.isKinematic = false;
            Body.useGravity = false;
            RigidbodyCompat.SetLinearDamping(Body, 10f);
            RigidbodyCompat.SetAngularDamping(Body, 10f);
            Body.interpolation = RigidbodyInterpolation.Interpolate;
            Body.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;

            SetIgnoreCollisions(holderColliders, true);
        }

        internal void OnDropped(Collider[] holderColliders)
        {
            Holder = null;

            Body.useGravity = _savedUseGravity;
            RigidbodyCompat.SetLinearDamping(Body, _savedLinearDamping);
            RigidbodyCompat.SetAngularDamping(Body, _savedAngularDamping);
            Body.interpolation = _savedInterpolation;
            Body.collisionDetectionMode = _savedCollisionMode;

            if (isActiveAndEnabled && recollideDelay > 0f)
            {
                _recollideRoutine = StartCoroutine(RecollideAfterDelay(holderColliders));
            }
            else
            {
                SetIgnoreCollisions(holderColliders, false);
            }
        }

        private IEnumerator RecollideAfterDelay(Collider[] holderColliders)
        {
            yield return new WaitForSeconds(recollideDelay);
            SetIgnoreCollisions(holderColliders, false);
            _recollideRoutine = null;
        }

        private void SetIgnoreCollisions(Collider[] others, bool ignore)
        {
            if (others == null) return;
            foreach (var mine in _colliders)
            {
                if (mine == null) continue;
                foreach (var other in others)
                {
                    if (other == null) continue;
                    Physics.IgnoreCollision(mine, other, ignore);
                }
            }
        }
    }
}

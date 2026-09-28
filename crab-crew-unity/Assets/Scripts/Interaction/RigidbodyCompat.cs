using UnityEngine;

namespace CrabCrew.Interaction
{
    /// <summary>
    /// Unity 6 renamed Rigidbody.velocity/drag to linearVelocity/linearDamping.
    /// These helpers let the interaction scripts compile on Unity 2022 LTS and Unity 6.
    /// </summary>
    public static class RigidbodyCompat
    {
        public static Vector3 GetVelocity(Rigidbody rb)
        {
#if UNITY_6000_0_OR_NEWER
            return rb.linearVelocity;
#else
            return rb.velocity;
#endif
        }

        public static void SetVelocity(Rigidbody rb, Vector3 value)
        {
#if UNITY_6000_0_OR_NEWER
            rb.linearVelocity = value;
#else
            rb.velocity = value;
#endif
        }

        public static float GetLinearDamping(Rigidbody rb)
        {
#if UNITY_6000_0_OR_NEWER
            return rb.linearDamping;
#else
            return rb.drag;
#endif
        }

        public static void SetLinearDamping(Rigidbody rb, float value)
        {
#if UNITY_6000_0_OR_NEWER
            rb.linearDamping = value;
#else
            rb.drag = value;
#endif
        }

        public static float GetAngularDamping(Rigidbody rb)
        {
#if UNITY_6000_0_OR_NEWER
            return rb.angularDamping;
#else
            return rb.angularDrag;
#endif
        }

        public static void SetAngularDamping(Rigidbody rb, float value)
        {
#if UNITY_6000_0_OR_NEWER
            rb.angularDamping = value;
#else
            rb.angularDrag = value;
#endif
        }
    }
}

using TMPro;
using UnityEngine;

namespace CrabCrew.Interaction
{
    /// <summary>
    /// Shows the PlayerInteractor's current prompt ("[E] Pick up Crab Trap") on screen.
    /// Put this on the prompt text object inside your HUD Canvas.
    /// </summary>
    public class InteractionPromptUI : MonoBehaviour
    {
        [Tooltip("The player's PlayerInteractor. Left empty, the first one in the scene is used.")]
        [SerializeField] private PlayerInteractor interactor;

        [Tooltip("Text component that displays the prompt.")]
        [SerializeField] private TMP_Text promptText;

        [Tooltip("Optional background panel to hide when there's no prompt. Must not be this object.")]
        [SerializeField] private GameObject promptBackground;

        private string _lastPrompt;

        private void Awake()
        {
            if (interactor == null) interactor = FindAnyObjectByType<PlayerInteractor>();
            if (promptText == null) promptText = GetComponent<TMP_Text>();
        }

        private void Update()
        {
            string prompt = interactor != null ? interactor.CurrentPrompt : string.Empty;
            if (prompt == _lastPrompt) return;
            _lastPrompt = prompt;

            bool visible = !string.IsNullOrEmpty(prompt);
            if (promptText != null)
            {
                promptText.text = prompt;
                promptText.enabled = visible;
            }
            if (promptBackground != null) promptBackground.SetActive(visible);
        }
    }
}

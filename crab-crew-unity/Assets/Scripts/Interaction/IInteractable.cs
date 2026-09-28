namespace CrabCrew.Interaction
{
    /// <summary>
    /// Anything the player can look at and press E on.
    /// Pickupable implements this today; later you can implement it on
    /// stations like the boat helm, sorting table, or shop counter.
    /// </summary>
    public interface IInteractable
    {
        /// <summary>Text shown on screen while the player is looking at this object.</summary>
        string GetPrompt(PlayerInteractor interactor);

        /// <summary>Whether pressing E right now will do anything.</summary>
        bool CanInteract(PlayerInteractor interactor);

        /// <summary>Called when the player presses E while looking at this object.</summary>
        void Interact(PlayerInteractor interactor);
    }
}

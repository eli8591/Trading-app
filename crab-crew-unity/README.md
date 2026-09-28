# Crab Crew: pick up, carry and drop

Scripts for a first-person "look at it, press E, carry it, drop it" system.
Works on Unity 2022.3 LTS and Unity 6, with either the new Input System or the old Input Manager.

## Files

Copy the `Assets/Scripts/Interaction/` folder into your Unity project's `Assets/` folder.

| Script | Goes on | Job |
| --- | --- | --- |
| `IInteractable.cs` | Nothing (it's an interface) | Contract for anything you can press E on. |
| `Pickupable.cs` | Each carryable object (trap, crate, bucket) | Holds object state and switches its physics between resting and carried. |
| `PlayerInteractor.cs` | The player root object | Looks through the camera, handles E / throw, moves the held object. |
| `InteractionPromptUI.cs` | A TextMeshPro text in your HUD Canvas | Shows "[E] Pick up Crab Trap". |
| `RigidbodyCompat.cs` | Nothing (static helper) | Handles Unity 6's `velocity` → `linearVelocity` rename. |

## Scene setup

### 1. Player

```
Player              ← CharacterController + your movement script + PlayerInteractor
└── Main Camera     ← your first-person camera
    └── HoldPoint   ← empty GameObject, local position (0, -0.3, 1.5)
```

1. Select the **Player** root and add **PlayerInteractor**.
2. Drag **Main Camera** into *Player Camera*.
3. Right-click Main Camera, choose **Create Empty**, name it `HoldPoint`, set its position to `(0, -0.3, 1.5)`, and drag it into *Hold Point*.
   If you skip this, the script creates one at that position when the game starts.

### 2. Carryable objects

For every crab trap, crate or bucket:

1. Give it a **Collider** (Box Collider is fine). It can be on a child mesh.
2. Add a **Rigidbody**. Set *Mass* (a trap around 3, a full crate around 15) and set *Interpolate* to **Interpolate**.
3. Add **Pickupable** and set *Display Name* (e.g. `Crab Trap`).
4. If it's rotated oddly while carried, adjust *Hold Rotation Offset*.

Objects heavier than the player's *Max Carry Mass* (default 25) show "too heavy" and can't be lifted.

### 3. Prompt text

1. **GameObject → UI → Text - TextMeshPro** (import TMP Essentials if Unity asks).
2. Anchor it to the bottom-centre of the Canvas.
3. Add **InteractionPromptUI** to that text object. The interactor and text fields fill themselves in if left empty.
4. Optional: add a small centred UI Image as a crosshair so players know what they're aiming at.

## Controls

| Action | Keyboard / mouse | Gamepad |
| --- | --- | --- |
| Pick up / drop | E | X / Square (west button) |
| Throw | Left mouse | Right trigger |

## Adding stations later

The helm, sorting table or shop counter can implement `IInteractable` too.
`PlayerInteractor` will find them with the same look ray, and `interactor.HeldObject` tells a station what the player is carrying:

```csharp
public class ShopCounter : MonoBehaviour, IInteractable
{
    public string GetPrompt(PlayerInteractor p) =>
        p.HeldObject != null ? $"[E] Sell {p.HeldObject.DisplayName}" : "Bring a crate to sell";

    public bool CanInteract(PlayerInteractor p) => p.HeldObject != null;

    public void Interact(PlayerInteractor p)
    {
        var crate = p.HeldObject;
        p.Drop();
        Destroy(crate.gameObject);
        // add money here
    }
}
```

While carrying something, E uses the station you're looking at if its `CanInteract` returns true; otherwise E drops the item.

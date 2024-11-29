export function ToggleOrbitControls(isOrbitControlActive, controls) {
    isOrbitControlActive = !isOrbitControlActive; // Toggle the state

    // Enable or disable the OrbitControls
    if (isOrbitControlActive) {
        controls.enabled = true; // Enable OrbitControls
        document.getElementById('orbitToggle').style.backgroundColor = 'red'; // Change button color to red
        document.getElementById('orbitToggle').textContent = 'Orbit Control: ON'; // Update button text
    } else {
        controls.enabled = false; // Disable OrbitControls
        document.getElementById('orbitToggle').style.backgroundColor = 'green'; // Change button color to green
        document.getElementById('orbitToggle').textContent = 'Orbit Control: OFF'; // Update button text
    }

    return isOrbitControlActive;  // Return the updated state
}



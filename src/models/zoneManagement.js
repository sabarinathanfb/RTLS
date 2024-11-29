import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

export function CreateBoxFromPoints(scene,width, height, positionX, positionZ, zoneName) {
    // Create the box geometry (this will define the shape)
    const boxGeometry = new THREE.BoxGeometry(width, 0.01, height);

    // Create the edges geometry from the box geometry
    const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);

    // Create a line material for the edges
    const lineMaterial = new THREE.LineBasicMaterial({ color: 'green' });

    // Create the line segments that represent the border of the box
    const borderBox = new THREE.LineSegments(edgesGeometry, lineMaterial);

    // Optionally position the box on the ground (set y position)
    borderBox.position.set(positionX, 1, positionZ);

    // Create a group to hold both borderBox and textMesh
    const zoneGroup = new THREE.Group();
    
    // Add the border box to the group
    zoneGroup.add(borderBox);

    const fontLoader = new FontLoader();

    // Load the font file and create the text
    fontLoader.load('/src/assets/fonts/gentilis_bold.typeface.json', function (font) {
        const textGeometry = new TextGeometry(zoneName, {
            font: font,
            size: 10,              // Adjust text size as needed
            depth: 1,             // Depth of the text
            curveSegments: 12,     // Number of segments for curves
            bevelEnabled: true,    // Enable/Disable bevel
            bevelThickness: 0.2,   // Thickness of the bevel
            bevelSize: 0.1,        // Distance from text outline to bevel
            bevelOffset: 0,
            bevelSegments: 3
        });

        // Center the text inside the box
        textGeometry.computeBoundingBox();
        const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
        const textHeight = textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y;

        const textMesh = new THREE.Mesh(textGeometry, new THREE.MeshBasicMaterial({ color: 0xffffff }));

        // Position the text in the center of the box
        textMesh.position.set(positionX - width / 2 + textWidth / 2, 1, positionZ);
        textMesh.rotation.x = -Math.PI / 2;

        // Add the text to the group
        zoneGroup.add(textMesh);
    });

    scene.add(zoneGroup);
    // Return the group for further manipulation if needed
    return { zoneGroup,zoneName, hasEntered: false };
}

const zoneDropdown = document.getElementById('zoneDropdown');

// Function to delete a zone
export function DeleteZone(zoneList, scene) {
    const zoneName = zoneDropdown.value;

    // Find the zone object by its name in the array
    const zoneIndex = zoneList.findIndex(zone => zone.zoneName === zoneName);
    if (zoneIndex !== -1) {
        const zone = zoneList[zoneIndex];
        // Remove the border box and the text from the scene
        scene.remove(zone.zoneGroup);
        // Remove the zone from the list
        zoneList.splice(zoneIndex, 1);
        console.log(`Zone "${zoneName}" has been deleted.`);
        console.log(zoneList);

        // Update the dropdown after deletion
        UpdateZoneDropdown(zoneList);
    } else {
        console.warn(`No zone found with the name "${zoneName}".`);
    }
}

// The dropdown element


export function UpdateZoneDropdown(zoneList) {
    // Clear existing options
    zoneDropdown.innerHTML = '<option value="">Select Zone</option>';

    // Iterate through the object values and add zone names to the dropdown
    Object.values(zoneList).forEach((zone) => {
        const option = document.createElement('option');
        option.value = zone.zoneName;
        option.textContent = zone.zoneName;
        zoneDropdown.appendChild(option);
    });

    // If there are zones, select the first one by default
    if (Object.keys(zoneList).length > 0) {
        zoneDropdown.value = Object.values(zoneList)[0].zoneName;
    } else {
        zoneDropdown.value = '';  // No zones available
    }
}
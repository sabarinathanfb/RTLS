import * as THREE from 'three';

export async function AddBotPosition(botName, x, z) {
    // Create an object that includes the bot name, x, and z
    const botPosition = {
        name: botName, // Include bot name
        x: x,
        z: z
    };
    console.log(botName,x,z);
    // Send the object as JSON to the server
    const response = await fetch('http://localhost:3000/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(botPosition) // Send the object as JSON
    });

    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Inserted document:', data); // Log the inserted document
}
export function DrawLine(startPosition, endPosition,scene,pathLines) {
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 }); // Green line for path

    const points = [];
    points.push(new THREE.Vector3(startPosition.x, startPosition.y, startPosition.z));
    points.push(new THREE.Vector3(endPosition.x, endPosition.y, endPosition.z));

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const line = new THREE.Line(geometry, material);
    line.position.y = 1;
    scene.add(line);

    // Store the line so that it can be managed later if needed
    pathLines.push(line);
}

export async function DrawBotLine(botName,scene) {
    try {
        const positions = await fetchBotPositions(botName);
        console.log('draw inputs',positions);
        // Check if positions is not empty
        if (positions.length === 0) {
            console.warn('No positions found for bot:', botName);
            return; // Exit if no positions
        }
        // Create an array of THREE.Vector3 from positions
        const points = positions.map(pos => new THREE.Vector3(pos.x, 0, pos.z)); // Assuming y is 0 for ground level
        // Create a geometry for the line
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        // Create a material for the line
        const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
        // Create the line
        const line = new THREE.Line(geometry, material);
        // Assuming you have a scene variable defined
        scene.add(line);
        line.position.y = 2;
    } catch (error) {
        console.error('Error drawing line:', error);
    }
}
async function fetchBotPositions(botName) {
    try {
        const response = await fetch(`http://localhost:3000/bot/${botName}`); // Use botName parameter
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log('Bot Positions:', data);
        return data; // Return the positions data
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
        return []; // Return an empty array in case of error
    }
}


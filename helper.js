import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import {QuadTree} from './src/QuadTree';
import { LoadLayoutModel, CreateBoxFromPoints ,floorMesh} from './src/models/loadLayoutModel';
import { CreatePanel} from './src/models/createPanel';
import { ToggleOrbitControls } from './src/models/eventListners';
import { AddBotPosition } from './src/models/helper';
import mqtt from 'mqtt';


const loader = new GLTFLoader();

// ================== VARIABLES ==================
let scene, camera, renderer, controls;
let  layoutModel,botModel;
export let zoneList = [];
let botList = [];
let collidableObjects = [];
const botMixers = {};
let selectedObject = null;
let fun1;
const bounds = {
    x: { min: -900, max: 900 },
    z: { min: -400, max: 400 },
};
const quadTree = new QuadTree(bounds);
let isWalking = false; // Flag to track if the bot is currently walking
const clock = new THREE.Clock();
const crossFadeControls = [];
let currentBaseAction = 'idle';
const allActions = [];
const baseActions = {
    idle: { weight: 1 },
    walk: { weight: 0 },
    run: { weight: 0 }
};
let previousPosition = null; // To store the previous bot position
let pathLines = [];
let isSetupPage = true;
let isMonitoringPage = false;


let positionIndex = 0; // To track the current position in the series
let jsonPositions = []; // Array to store the series of positions
let isMovingThroughPositions = false;

const client = mqtt.connect('ws://test.mosquitto.org:8080/mqtt');
client.on('connect', function () {
    console.log('Connected to MQTT broker');
    client.subscribe('test', function (err) {
        if (!err) {
            console.log('Subscribed to test topic');
        }
    });
});


// Handle incoming messages
client.on('message', function (topic, message) {
    const positionData = JSON.parse(message.toString());
    // console.log(positionData);
    if (positionData && typeof positionData.x === 'number' && typeof positionData.z === 'number') {
        console.log(`Received position: x = ${positionData.x}, z = ${positionData.z}`);
        // updateBotPosition(positionData.x, positionData.z);
    }
});

const positionSeries = [
    { x: 0, z: 5 },
    { x: 0, z: -10 },
    { x: 0, z: -20 },
    { x: 0, z: -30 },
    { x: 0, z: -40 },
    { x: 0, z: -50 },
    { x: 0, z: -60 },
    { x: 10, z: -60 },
    { x: 20, z: -60 },
    { x: 30, z: -60 },
    { x: 40, z: -60 },
    { x: 50, z: -60 },
    { x: 60, z: -60 },
];
// fetchDocuments(); // Call this to fetch documents
function enableSetupListeners() {
    window.addEventListener('click', onMouseClick);
    window.removeEventListener('keydown', moveAndAnimateBot); // Make sure other listeners are removed
    window.removeEventListener('keyup', onKeyUp);
}

function enableMonitoringListeners() {
    window.addEventListener('keydown', moveAndAnimateBot);
    window.addEventListener('keyup', onKeyUp);
    window.removeEventListener('click', onMouseClick); // Remove click listener for setup
}

function onKeyUp(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code) && isWalking) {
        prepareCrossFade(
            allActions.find(action => action.getClip().name === currentBaseAction),
            baseActions['idle'].action,
            .1
        );
        isWalking = false; // Set walking state to false when the key is released
    }
}
document.getElementById('setupPageButton').addEventListener('click', () => {
    isSetupPage = true;
    isMonitoringPage = false;
    enableSetupListeners();  // Enable setup listeners
});

document.getElementById('monitoringPageButton').addEventListener('click', () => {
    isSetupPage = false;
    isMonitoringPage = true;
    enableMonitoringListeners();  // Enable monitoring listeners
});
document.addEventListener('DOMContentLoaded', function() {
    const botDropdown = document.getElementById('botDropdown');
    const botInput = document.getElementById('botInput');
    
    botDropdown.addEventListener('change', function() {
        // Show the input field if a bot is selected, hide if no selection
        if (botDropdown.value) {
            botInput.style.display = 'block';
        } else {
            botInput.style.display = 'none';
        }
    });
});


// ================== INITIALIZATION ==================
function init() {
    // ================== SCENE SETUP ==================
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 10, 100000);
    camera.position.set(0, 1000, 100);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    // ================== LIGHTING ==================
    const ambientLight = new THREE.AmbientLight('white', 1);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight('white', 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
    // ================== CONTROLS ==================
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.update();
    // ================== MODEL LOADING ==================
    LoadLayoutModel(layoutModel,collidableObjects,loader,scene,() =>{
        console.log('Access floorMesh:', floorMesh);
    });

    // ================== GUI ==================
    fun1 = CreatePanel({
        GUI,
        zoneList,
        botList,
        scene,
        CreateBoxFromPoints,
        LoadBotModel,
        deleteZone,
        prepareCrossFade,
        baseActions,
        crossFadeControls,
        updateBotDropdown
    });
    // ================== EVENT LISTENERS ==================
    // Event listener for window resize
    window.addEventListener('resize', handleWindowResize);

    // Page switch event listeners
    document.getElementById('setupPageButton').addEventListener('click', () => {
        isSetupPage = true;
        isMonitoringPage = false;
        enableSetupListeners();  // Enable setup-specific listeners
    });

    document.getElementById('monitoringPageButton').addEventListener('click', () => {
        isSetupPage = false;
        isMonitoringPage = true;
        enableMonitoringListeners();  // Enable monitoring-specific listeners
    });

    document.getElementById('bot_1_button').addEventListener('click', () => {
        drawBotLine('bot1'); // Call the function to draw the line for bot1
    });
    document.getElementById('getEntriesButton').addEventListener('click', () => {
        const allPointsWithFrequency = quadTree.retrieve(bounds);
        console.log('All points in the QuadTree with frequency:', allPointsWithFrequency);
    });

    let isOrbitControlActive = true; // To track the state of OrbitControls

    // Function to toggle OrbitControls on and off
    function toggleOrbitControls() {
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
    }
    document.getElementById('orbitToggle').addEventListener('click', toggleOrbitControls);

    // document.getElementById('animatePosition').addEventListener('click', () => {
    //     updateBotPositionFromSeries(positionSeries);
    // });

    document.getElementById('animatePosition').addEventListener('click', () => {
        fetch('/positionSeries.json')
            .then(response => response.json())
            .then(data => {
                updateBotPositionFromSeries(data); // Move bot through loaded positions
            })
            .catch(error => console.error('Error loading position series:', error));
    });
    
    
    

    
    // ================== START ANIMATION ==================
    animate();
}

let isDrawing = false;
    let startPoint = null;   // Starting point of the box
    let endPoint = null;     // Ending point of the box
    let boxData = null;      // Store the box data returned from CreateBoxFromPoints

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

function onMouseClick(event) {

    const rect = renderer.domElement.getBoundingClientRect();
    // Convert mouse position to normalized device coordinates (-1 to +1)
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast to find the point on the floorMesh
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(floorMesh);

    if (intersects.length > 0) {
        const clickedPoint = intersects[0].point;  // 3D point on the floor
        console.log(clickedPoint);
    
        // Get the zone name from the input field
        const zoneName = document.getElementById('zoneNameInput').value.trim();
        
        if (!zoneName) {
            alert('Please enter a zone name!');
            return;  // Exit if no zone name is provided
        }
    
        if (!isDrawing) {
            // First click: Set the start point
            startPoint = clickedPoint;
            isDrawing = true;
        } else {
            // Second click: Set the end point and calculate the box dimensions
            endPoint = clickedPoint;
            isDrawing = false;
    
            // Calculate width and height based on start and end points
            const width = Math.abs(endPoint.x - startPoint.x);
            const height = Math.abs(endPoint.z - startPoint.z);
    
            // Calculate the center position for the box
            const centerX = (startPoint.x + endPoint.x) / 2;
            const centerZ = (startPoint.z + endPoint.z) / 2;
    
            // Check if zone already exists
            if (!zoneList.some(zone => zone.zoneName === zoneName)) {
                CreateBoxFromPoints(scene, width, height, centerX, centerZ, zoneName,zoneList);
        
            } else {
                alert('Zone with this name already exists.');
            }
            // Reset start and end points for the next box creation
            startPoint = null;
            endPoint = null;

            document.getElementById('zoneNameInput').value = '';

            fun1();
        }
    }
    
}

const botDropdown = document.getElementById('botDropdown');
// Function to update the dropdown with the bot names
function updateBotDropdown() {
    // Clear existing options
    botDropdown.innerHTML = '<option value="">Select Bot</option>';
    // Add new options based on botList
    botList.forEach((bot) => {
        const option = document.createElement('option');
        option.value = bot.name;
        option.textContent = bot.name;
        botDropdown.appendChild(option);
    });
}
// Set selectedObject when a bot is chosen from the dropdown
botDropdown.addEventListener('change', (event) => {
    const selectedBotName = event.target.value;
    if (selectedBotName) {
        // Find the selected bot from botList
        const selectedBot = botList.find((bot) => bot.name === selectedBotName);
        if (selectedBot) {
            selectedObject = selectedBot;  // Update selectedObject with the selected bot
            console.log(`Selected Bot: ${selectedObject.name}`);
        }
    } else {
        selectedObject = null;  // If no bot is selected, set selectedObject to null
    }
});
// ================== WINDOW RESIZE HANDLER ==================
function handleWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function addBoxHelper(object, color = 0xff0000) {
    const boxHelper = new THREE.BoxHelper(object, color);
    scene.add(boxHelper);
    return boxHelper;
}
// ================== COLLISION DETECTION ==================
function hasCollision(object) {

    // Create a bounding box for the object
    const objectBox = new THREE.Box3().setFromObject(object);
    // // // Add a visual helper for the object
    // addBoxHelper(floorMesh,0x00ff00)
    // Check for collisions with collidable objects
    for (const collidable of collidableObjects) {
        // Ensure the collidable object is a valid THREE.Object3D
        if (!collidable.isObject3D) {
            continue; // Skip invalid objects
        }
        // Create a bounding box for the collidable object
        const collidableBox = new THREE.Box3().setFromObject(collidable);
        // Add a visual helper for each collidable object
        // addBoxHelper(collidable, 0xff0000); // Red for collidable objects
        // Check for intersection (collision) between object and collidable
        if (objectBox.intersectsBox(collidableBox)) {
            console.log('Collision with object:', collidable);
            return true; // Collision occurred
        }
    }
    return false; // No boundary crossing or collisions detected
}
function updateBotPosition(botPosition) {
    const point = { x: botPosition.x, z: botPosition.z };
    AddBotPosition("bot1",point.x, point.z)
    .then(() => console.log('Bot position added successfully'))
    .catch(error => console.error('Error adding bot position:', error));
    // Insert the new point in the QuadTree
    const existingPoint = quadTree.insert(point);

    if (existingPoint) {
        console.log(`Point updated: ${JSON.stringify(existingPoint)}`);
    } else {
        console.log(`New point added: ${JSON.stringify(point)}`);
    }
    // Check if there was a previous position to draw a line from
    if (previousPosition) {
        // Create a new line segment between the previous and current positions
        drawLine(previousPosition, botPosition);
    }
    // Update the previous position to the current one
    previousPosition = { x: botPosition.x, y: botPosition.y, z: botPosition.z };
}
function drawLine(startPosition, endPosition) {
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
async function drawBotLine(botName) {
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
function deleteZone(zoneName) {
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
    } else {
        console.warn(`No zone found with the name "${zoneName}".`);
    }
}
// Function to check if the bot has entered a zone
function checkBotInZone(bot) {
    const botPosition = bot.position;
    console.log("checking bot is inside zone");
    zoneList.forEach(zone => {
        const boxPos = zone.zoneGroup.children[0].position
        console.log(boxPos);
        const geometry = zone.zoneGroup.children[0].geometry.parameters.geometry.parameters
        const width = geometry.width;
        const depth = geometry.depth;
        // Calculate the zone's boundaries based on its position and size
        const minX = boxPos.x - width / 2;
        const maxX = boxPos.x + width / 2;
        const minZ = boxPos.z - depth / 2;
        const maxZ = boxPos.z + depth / 2;
        console.log("Zone boundaries:");
        console.log("minX:", minX, "maxX:", maxX);
        console.log("minZ:", minZ, "maxZ:", maxZ);
        console.log("Bot position:", botPosition.x, botPosition.z);
        if (botPosition.x >= minX && botPosition.x <= maxX &&
            botPosition.z >= minZ && botPosition.z <= maxZ) {
            // Check if the bot has already entered the zone
            if (!zone.hasEntered) {
                console.log("Bot enters zone");
                // Bot has entered the zone for the first time, trigger alert
                alert(`${bot.name} entered ${zone.zoneName}`);
                // Set the flag to true so the alert won't trigger again for this zone
                zone.hasEntered = true;
            }
        }else {
            // If the bot has entered the zone previously and is now outside, trigger exit alert
            if (zone.hasEntered) {
                console.log("Bot exits zone");
                // Bot has exited the zone, trigger exit alert
                alert(`${bot.name} exited ${zone.zoneName}`);
                // Set the flag to false so the entry alert can trigger again next time
                zone.hasEntered = false;
            }
        }
    });
}

// ================== MODEL LOADING ==================
async function LoadBotModel(botName, scaleX, scaleY, scaleZ, posX, posZ) {
    return new Promise((resolve, reject) => {
        loader.load('/src/assets/gltf/Xbot.glb', (gltf) => {
            const botModel = gltf.scene;
            scene.add(botModel);
            botModel.name = botName;
            botModel.scale.set(scaleX, scaleY, scaleZ);
            botModel.position.set(posX, 0, posZ);

            botModel.traverse((object) => {
                if (object.isMesh) object.castShadow = true; // Enable shadow casting
            });

            const animations = gltf.animations;
            const mixer = new THREE.AnimationMixer(botModel);  // Create a mixer for each bot
            botMixers[botName] = mixer;  // Store the mixer for the specific bot

            animations.forEach((clip) => {
                const name = clip.name;
                if (baseActions[name]) {
                    const action = mixer.clipAction(clip);
                    activateAction(action);
                    baseActions[name].action = action;
                    allActions.push(action);
                }
            });

            resolve(botModel); // Resolve with botModel when done
        }, undefined, (error) => {
            console.error('Error loading bot model:', error);
            reject(error); // Reject in case of error
        });
    });
}

function moveAndAnimateBot(event) {
    const moveDistance = 5;
    if (selectedObject && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        const originalPosition = selectedObject.position.clone(); // Store the original position
        console.log(selectedObject.name);

        // Define key movement mappings
        const movementMap = {
            'ArrowRight': { axis: 'x', distance: moveDistance },  // Move right
            'ArrowLeft': { axis: 'x', distance: -moveDistance },   // Move left
            'ArrowUp': { axis: 'z', distance: -moveDistance },     // Move forward
            'ArrowDown': { axis: 'z', distance: moveDistance }     // Move backward
        };

        // Apply movement if the key is in the movementMap
        const movement = movementMap[event.code];
        if (movement) {
            selectedObject.position[movement.axis] += movement.distance;

            // Apply animation only to the selected bot
            const mixer = botMixers[selectedObject.name]; // Get the mixer for the selected bot
            if (mixer) {
                prepareCrossFade(allActions.find(action => action.getClip().name === currentBaseAction), baseActions['walk'].action, 0.01);
                isWalking = true; // Set walking state to true when any arrow key is pressed
                mixer.update(clock.getDelta());  // Update the animation for the selected bot
            }
        }

        checkBotInZone(selectedObject);

        // Check for collisions after moving
        const collidedObject = hasCollision(selectedObject);
        if (collidedObject) {
            selectedObject.position.copy(originalPosition); // Revert to the original position on collision
        }
    }
}



function updateBotPositionFromSeries(jsonData) {
    
    if (selectedObject && !isMovingThroughPositions) {
        jsonPositions = jsonData; // Store the series of positions
        positionIndex = 0; // Reset the index
        isMovingThroughPositions = true; // Set flag to prevent re-triggering
        console.log(jsonPositions);
        moveToNextPosition(); // Start moving to the first position
    }
}

function moveToNextPosition() {
    if (positionIndex < jsonPositions.length) {
        const { x, z } = jsonPositions[positionIndex]; // Get the next position
        const originalPosition = selectedObject.position.clone(); // Store original position

        console.log('x,y', x , z);
        // Update the bot's position
        selectedObject.position.set(x, selectedObject.position.y,z);

        // Apply animation only to the selected bot
        const mixer = botMixers[selectedObject.name];
        if (mixer) {
            prepareCrossFade(allActions.find(action => action.getClip().name === currentBaseAction), baseActions['walk'].action, 0.01);
            isWalking = true;
            mixer.update(clock.getDelta());
        }

        checkBotInZone(selectedObject);

        // Check for collisions
        const collidedObject = hasCollision(selectedObject);
        if (collidedObject) {
            selectedObject.position.copy(originalPosition); // Revert to original position if collision detected
        } else {
            positionIndex++; // Move to the next position in the series
        }

        // Schedule the next movement after a short delay
        setTimeout(() => {
            moveToNextPosition(); // Recursively move to the next position
        }, 1000/30); // Adjust delay for smoother movement (30 FPS in this case)
    } else {
        isMovingThroughPositions = false; // Movement through series complete
    }
}


function activateAction(action) {
    const clip = action.getClip();
    const settings = baseActions[clip.name] || additiveActions[clip.name];
    setWeight(action, settings.weight);
    action.play();
}
function prepareCrossFade( startAction, endAction, duration ) {
    // If the current action is 'idle', execute the crossfade immediately;
    // else wait until the current action has finished its current loop
    if ( currentBaseAction === 'idle' || ! startAction || ! endAction ) {
        executeCrossFade( startAction, endAction, duration );
    } else {
        synchronizeCrossFade( startAction, endAction, duration );
    }
    // Update control colors
    if ( endAction ) {
        const clip = endAction.getClip();
        currentBaseAction = clip.name;
    }
    crossFadeControls.forEach( function ( control ) {
        const name = control.property;
        if ( name === currentBaseAction ) {
            control.setActive();
        } else {
            control.setInactive();
        }
    } );
}
function synchronizeCrossFade(startAction, endAction, duration) {
    const mixer = botMixers[selectedObject.name]; // Fetch the mixer for the selected bot

    if (!mixer) {
        console.error('Mixer not found for bot:', selectedObject.name); // Log error if mixer is not found
        return; // Exit if no mixer is found
    }

    mixer.addEventListener('loop', onLoopFinished);

    function onLoopFinished(event) {
        if (event.action === startAction) {
            mixer.removeEventListener('loop', onLoopFinished);
            executeCrossFade(startAction, endAction, duration);
        }
    }
}

function executeCrossFade( startAction, endAction, duration ) {
    // Not only the start action, but also the end action must get a weight of 1 before fading
    // (concerning the start action this is already guaranteed in this place)
    if ( endAction ) {
        setWeight( endAction, 1 );
        endAction.time = 0;
        if ( startAction ) {
            // Crossfade with warping
            startAction.crossFadeTo( endAction, duration, true );
        } else {
            // Fade in
            endAction.fadeIn( duration );
        }
    } else {
        // Fade out
        startAction.fadeOut( duration );
    }
}
// This function is needed, since animationAction.crossFadeTo() disables its start action and sets
// the start action's timeScale to ((start animation's duration) / (end animation's duration))
function setWeight(action, weight) {
    if (action) {  // Ensure action is not null or undefined
        action.enabled = true;
        action.setEffectiveTimeScale(1);
        action.setEffectiveWeight(weight);
    }
}
// ================== ANIMATION LOOP ==================
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera); // Render the scene
}
// ================== START ==================
init();

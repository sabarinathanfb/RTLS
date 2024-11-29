import * as THREE from 'three';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export async function LoadBotModel(botName,posX, posZ,scene,botMixers,baseActions,activateAction,allActions) {
    return new Promise((resolve, reject) => {
        loader.load('/src/assets/gltf/Xbot.glb', (gltf) => {
            const botModel = gltf.scene;
            scene.add(botModel);
            botModel.name = botName;
            botModel.scale.set(50, 50, 50);
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

const botDropdown = document.getElementById('botDropdown');

// Function to update the dropdown with the bot names
export function UpdateBotDropdown(botList) {
    // Clear existing options
    botDropdown.innerHTML = '<option value="">Select Bot</option>';

    // Add new options based on botList
    botList.forEach((bot) => {
        const option = document.createElement('option');
        option.value = bot.name;
        option.textContent = bot.name;
        botDropdown.appendChild(option);
    });

    // If there are bots, select the first one by default
    if (botList.length > 0) {
        botDropdown.value = botList[0].name;  // Set the first bot as selected
    }else{
        botDropdown.value = '';
    }
}

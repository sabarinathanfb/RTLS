import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

const loader = new GLTFLoader();
export let floorMesh = null;

export function LoadLayoutModel(layoutModel, collidableObjects,scene, onLoadComplete) {

    scene.background = new THREE.Color(0x87CEEB);
    loader.load('/src/assets/gltf/Layout_V_0.3.gltf', (gltf) => {
        // Create the floor mesh and assign it to the global floorMesh
        const geometry = new THREE.PlaneGeometry(1800, 800);
        const material = new THREE.MeshStandardMaterial({ color: 'white', side: THREE.DoubleSide });
        floorMesh = new THREE.Mesh(geometry, material);  // Assign to the global variable
        scene.add(floorMesh);
        floorMesh.rotation.x = -Math.PI / 2;
        // Load the layout model
        layoutModel = gltf.scene;
        scene.add(layoutModel);
        layoutModel.position.set(0, 0, 40);

        // Add layout children to collidable objects
        for (let i = 0; i < layoutModel.children.length; i++) {
            collidableObjects.push(layoutModel.children[i]);
        }

        // Call the callback once the loading is done
        if (onLoadComplete) {
            onLoadComplete();
        }
    });
}
# Maze3D — Lumina Immersive Physics Maze

A high-fidelity, immersive 3D maze game built with **Three.js** and **MediaPipe Hand Tracking**. Navigate a ball through a procedurally generated maze using physical gestures and real-time depth-sensing controls.

## 🌟 Core Features

-   **Procedural Maze Generation**: Every game is a unique challenge generated via a recursive backtracker (DFS) algorithm with multiple difficulty sizes (Practice, Normal, Large).
-   **Gesture-Based Interaction**:
    -   **Pinch-to-Activate (Safety Delay)**: All major board manipulations now require a **0.6-second intentional hold** (pinch or hover) to prevent accidental movements. A visual progress ring provides real-time feedback.
    -   **Hover Push (Tilt)**: Physically push the board down by holding your hands over the maze. The closer your hand is to the webcam, the harder it pushes down on that side of the maze!
    -   **Camera Orbit**: Pinch one hand and drag to smoothly rotate your viewing angle around the 3D board.
    -   **Pinch-to-Zoom**: Pinch both hands and pull them apart or together to seamlessly zoom into specific areas of the maze.
    -   **Depth Calibration**: Integrated calibration system to map your hand size to the optimal "push depth" based on your webcam and room lighting.
-   **Dynamic Game Mechanics**:
    -   **Power-Ups**: Collect glowing beacons to trigger **Freeze Time** (stops the clock), **Speed Boost**, or **Teleport** (skips ahead).
    -   **Hazard Tiles**: Avoid glowing red hazard zones that reset your position to the starting tile.
    -   **3D Menu Physics**: A fully interactive 3D home screen and instruction menu with physics-based "mini-games" you can play while choosing your settings.
-   **Advanced HUD**:
    -   **Adaptive Minimap**: A real-time 2D radar that automatically rotates and scales to match your 3D viewing angle and zoom level.
    -   **Hand Overlay**: Real-time webcam overlay showing your hand landmarks and gesture activation progress.
    -   **Timer & Power-Up Indicators**: Visual feedback for active power-ups and game progress.

## 🛠 Tech Stack

-   **Three.js**: Immersive 3D Rendering & Geometry
-   **MediaPipe**: AI-powered hand landmarker and gesture tracking
-   **Vite**: High-performance development and build pipeline
-   **Custom Physics**: Manual implementation of momentum, friction, and AABB collision detection
-   **CSS3**: Modern "Dark Academic" UI design with glassmorphism and 3D transforms

## 🚀 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18+ recommended)
-   A webcam for hand tracking controls

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/josh-destef/Project3-threejs.git
    cd Project3-threejs
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the development server**:
    ```bash
    npm run dev
    ```

4.  **Open the game**: Navigate to `http://localhost:5173`.

## 🎮 Controls & Gestures

### The Confirmation Rule
To prevent accidental rotations, the game features a **Confirmation Timer**. When you pinch or hover over the board, a progress ring will fill up around your fingers. Once the ring is full, the action becomes active. You can adjust this delay in the settings menu (default is **1.0 seconds**).

| Action | Gesture | Description |
| :--- | :--- | :--- |
| **Tilt Board** | Hover or Pinch | Hold hand over the board for 0.6s. Move closer to the camera to push harder. |
| **Orbit Camera** | Pinch & Drag | Pinch 1 hand for 0.6s in 'Hover' mode to rotate the camera view. |
| **Zoom** | Pinch both hands | Pinch both hands for 0.6s. Pull apart to zoom in, push together to zoom out. |
| **Reset** | Keyboard `R` | Instantly reset the ball to the starting position. |

## 📂 Project Structure

-   `main.js`: Game loop, camera management, and gesture orchestration.
-   `gestureControls.js`: MediaPipe integration and hand state processing.
-   `world.js`: 3D scene construction, lighting, and environment geometry.
-   `ball.js`: Physics-based ball movement and collision logic.
-   `maze.js`: Procedural generation algorithm and layout data.
-   `hud.js`: UI elements, minimap rendering, and hand overlay logic.

---
Built for **Platform-Based Computing** // Villanova University

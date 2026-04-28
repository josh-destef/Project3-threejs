# Maze3D — Three.js Physics Game

A high-fidelity 3D maze game built with **Three.js** and **Vite**. Navigate a ball through a procedurally generated maze by tilting the game board in real-time.

## Features

-   **Procedural Maze Generation**: Every game uses a unique layout generated via a recursive backtracker (DFS) algorithm.
-   **Real-time Physics**: Custom manual physics engine handling gravity, momentum, friction, and AABB collision detection.
-   **Dynamic Hand Tracking Controls**:
    -   **Hover Push**: Physically push the board down by holding your hands over the maze. The closer your hand is to the webcam, the harder it pushes!
    -   **Camera Orbit**: Pinch one hand and drag to rotate your viewing angle around the 3D board.
    -   **Pinch-to-Zoom**: Pinch both hands and pull them apart or together to seamlessly zoom into specific areas of the maze.
    -   **Calibration**: Easily calibrate your "maximum push" distance to perfectly match your webcam and lighting setup.
-   **Responsive HUD**:
    -   **Timer**: Track how fast you can clear the maze.
    -   **Dynamic Minimap**: A real-time 2D radar that automatically rotates to match your 3D viewing angle!
    -   **Win State**: Victory screen with final time and a "Play Again" option.
-   **Lighting & Atmosphere**: Ambient, directional, and point lights (including a ball-following light) for a premium look.

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v16+ recommended)
-   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/josh-destef/Project3-threejs.git
    cd Project3-threejs
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

4.  Open your browser to the URL shown in the terminal (usually `http://localhost:5173`).

## Controls

-   **Tilt Board**: Hold your hands in front of the webcam. The board acts like a see-saw—moving your hand closer to the lens acts as a heavier "weight" on that side of the maze!
-   **Rotate Camera**: Pinch with one hand and drag left/right or up/down. The camera will orbit the board, keeping your hand movements relative to your new point of view.
-   **Zoom Camera**: Pinch with two hands simultaneously. Moving them apart zooms in on the center of the pinch, while moving them together zooms out to the absolute center of the board.
-   **Goal**: Navigate the white ball to the **Green Beacon** at the far corner of the maze. (Or center, depending on mode).

## Project Structure

-   `main.js`: Core game loop, camera management, and orchestration.
-   `maze.js`: Implementation of the recursive backtracker maze algorithm.
-   `world.js`: Scene setup, lighting, and 3D geometry construction for the board.
-   `ball.js`: Ball movement logic, collision physics, and local-to-world mapping.
-   `controls.js`: Input handling for board tilting and camera orbiting.
-   `hud.js`: UI elements for the timer, minimap, and game state.
-   `style.css`: Modern styling for the HUD and interactive overlays.

## Tech Stack

-   **Three.js**: 3D Rendering & Geometry
-   **Vite**: Fast development build tool
-   **JavaScript (ES6+)**: Modular logic
-   **CSS3**: Custom UI design

# Maze3D — Three.js Physics Game

A high-fidelity 3D maze game built with **Three.js** and **Vite**. Navigate a ball through a procedurally generated maze by tilting the game board in real-time.

![Maze Gameplay Mockup](https://via.placeholder.com/800x450.png?text=Maze3D+Gameplay)

## 🎮 Features

-   **Procedural Maze Generation**: Every game uses a unique layout generated via a recursive backtracker (DFS) algorithm.
-   **Real-time Physics**: Custom manual physics engine handling gravity, momentum, friction, and AABB collision detection.
-   **Dynamic Controls**: 
    -   **Tilt**: Interactive 3D arrow meshes allow you to tilt the board in four directions.
    -   **Orbit**: Drag on the canvas to rotate the camera around the board for the best viewing angle.
-   **Responsive HUD**:
    -   **Timer**: Track how fast you can clear the maze.
    -   **Minimap**: A real-time 2D top-down view of your position.
    -   **Win State**: Victory screen with final time and a "Play Again" option.
-   **Lighting & Atmosphere**: Ambient, directional, and point lights (including a ball-following light) for a premium look.

## 🚀 Getting Started

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

## 🕹️ Controls

-   **Tilt Board**: Click/Touch and hold the **3D Orange Arrows** on the rim of the board.
-   **Rotate Camera**: Click and drag anywhere on the **empty space/background** to orbit the camera.
-   **Goal**: Navigate the white ball to the **Green Beacon** at the far corner of the maze.

## 📂 Project Structure

-   `main.js`: Core game loop, camera management, and orchestration.
-   `maze.js`: Implementation of the recursive backtracker maze algorithm.
-   `world.js`: Scene setup, lighting, and 3D geometry construction for the board.
-   `ball.js`: Ball movement logic, collision physics, and local-to-world mapping.
-   `controls.js`: Input handling for board tilting and camera orbiting.
-   `hud.js`: UI elements for the timer, minimap, and game state.
-   `style.css`: Modern styling for the HUD and interactive overlays.

## 🛠️ Tech Stack

-   **Three.js**: 3D Rendering & Geometry
-   **Vite**: Fast development build tool
-   **JavaScript (ES6+)**: Modular logic
-   **CSS3**: Custom UI design

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

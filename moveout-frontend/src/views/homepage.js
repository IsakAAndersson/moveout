import React from "react";
import { Link } from "react-router-dom";
import "../App.css";

function Home() {
    return (
        <div className="home-container">
            <Link to="/create-label">
                <button className="home-button">Create Label</button>
            </Link>
            <img className="home-image" src="https://www.wheatonworldwide.com/wp-content/uploads/2023/04/box1.png" alt="Box" />
        </div>
    );
}

export default Home;

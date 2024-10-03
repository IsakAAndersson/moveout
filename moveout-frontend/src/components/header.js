import React from "react";
import { Link } from "react-router-dom"; // Importera Link från react-router-dom
import "./../App.css";

function Header() {
    return (
        <header className="header">
            <h1 className="header-title">MoveOut</h1>
            <nav className="header-nav">
                <Link to="/" className="header-link">
                    Home
                </Link>
                <Link to="/labels" className="header-link">
                    Labels
                </Link>
            </nav>
        </header>
    );
}

export default Header;

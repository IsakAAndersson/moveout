import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./../App.css";

function Header() {
    const [userRole, setUserRole] = useState(localStorage.getItem("userRole"));

    useEffect(() => {
        const handleStorageChange = () => {
            setUserRole(localStorage.getItem("userRole"));
        };

        window.addEventListener("loginStateChange", handleStorageChange);

        return () => {
            window.removeEventListener("loginStateChange", handleStorageChange);
        };
    }, []);

    return (
        <header className="header">
            <h1 className="header-title">MoveOut</h1>
            <nav className="header-nav">
                <Link to="/" className="header-link">
                    Home
                </Link>{" "}
                |
                <Link to="/labels" className="header-link">
                    Labels
                </Link>{" "}
                |
                <Link to="/create-label" className="header-link">
                    Create Label
                </Link>{" "}
                |
                {!userRole && (
                    <>
                        <Link to="/login" className="header-link">
                            Login
                        </Link>{" "}
                        |
                        <Link to="/register" className="header-link">
                            Register
                        </Link>
                    </>
                )}
                {userRole === "user" && (
                    <Link to="/profile" className="header-link">
                        Profile
                    </Link>
                )}
                {userRole === "admin" && (
                    <Link to="/admin" className="header-link">
                        Admin
                    </Link>
                )}
                {userRole && (
                    <Link to="/logout" className="header-link">
                        Logout
                    </Link>
                )}
            </nav>
        </header>
    );
}

export default Header;

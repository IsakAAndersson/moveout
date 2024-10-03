import React from "react";
import Header from "../components/header";
import Footer from "../components/footer";

function Layout({ children }) {
    return (
        <div className="layout-container">
            <Header /> {/* Lägg till headern här */}
            <main>{children}</main>
            <Footer /> {/* Lägg till footern här */}
        </div>
    );
}

export default Layout;

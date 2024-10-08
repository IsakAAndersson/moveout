import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Layout from "./views/layout";
import Home from "./views/homepage";
import CreateLabel from "./views/createLabel";
import LabelDetail from "./views/labelDetail";
import LabelView from "./views/labelView";
import Register from "./views/register";
import Login from "./views/login";

function App() {
    return (
        <Router>
            <Layout>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/create-label" element={<CreateLabel />} />
                    <Route path="/label/:customerId/:labelId" element={<LabelDetail />} />
                    <Route path="/labels" element={<LabelView />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />
                </Routes>
            </Layout>
        </Router>
    );
}

export default App;

import React from "react";

const Button = ({ children, ...props }) => {
    return (
        <button {...props} className="bg-blue-500 text-white px-4 py-2 rounded">
            {children}
        </button>
    );
};

export default Button;

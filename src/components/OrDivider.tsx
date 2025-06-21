import React from "react";

const OrDivider = () => {
    return (
        <div className="flex items-center w-full max-w-xs my-4">
            <div className="flex-grow border-t border-[var(--text)]"></div>
            <span className="px-4 text-[var(--text)] text-sm">OR</span>
            <div className="flex-grow border-t border-[var(--text)]"></div>
        </div>
    );
};

export default OrDivider;

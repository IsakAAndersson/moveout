import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function CreateLabel() {
    const [customerId, setCustomerId] = useState("");
    const [labelName, setLabelName] = useState("");
    const [labelType, setLabelType] = useState("standard");
    const [textDescription, setDescription] = useState("");
    const [isPrivate, setIsPrivate] = useState("public");
    const [customers, setCustomers] = useState([]);
    const [images, setImages] = useState([]);
    const [audio, setAudio] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const navigate = useNavigate();
    const [errorMessage, setErrorMessage] = useState("");
    const apiUrl = process.env.REACT_APP_API_URL || "/api";
    const [userRole, setUserRole] = useState("");
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);

    const fetchCustomers = useCallback(async () => {
        try {
            const response = await axios.get(`${apiUrl}/customers`);
            setCustomers(response.data);
        } catch (error) {
            console.error("Error fetching customers:", error);
        }
    }, [apiUrl]);

    useEffect(() => {
        const storedCustomerId = localStorage.getItem("customerId");
        const storedUserRole = localStorage.getItem("userRole");
        console.log("Stored Customer ID:", storedCustomerId);
        console.log("Stored User Role:", storedUserRole);

        if (storedUserRole === "user" && storedCustomerId) {
            setCustomerId(storedCustomerId);
        } else if (storedUserRole === "admin") {
            fetchCustomers();
        }
        setUserRole(storedUserRole || "");
    }, [fetchCustomers]);

    useEffect(() => {
        console.log("Current customerId:", customerId);
        console.log("Current userRole:", userRole);
    }, [customerId, userRole]);

    const handleImageChange = (e) => {
        setImages([...e.target.files]);
    };

    const handleAudioChange = (e) => {
        setAudio(e.target.files[0]);
    };

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoRef.current.srcObject = mediaStream;
            videoRef.current.style.display = "block";
        } catch (error) {
            console.error("Error accessing camera:", error);
        }
    };

    const takePhoto = () => {
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
            const newImages = [...images, new File([blob], "photo.jpg", { type: "image/jpeg" })];
            setImages(newImages);
        }, "image/jpeg");
    };

    const startRecording = () => {
        navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                const audioChunks = [];

                mediaRecorder.addEventListener("dataavailable", (event) => {
                    audioChunks.push(event.data);
                });

                mediaRecorder.addEventListener("stop", () => {
                    const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
                    setAudio(new File([audioBlob], "recording.wav", { type: "audio/wav" }));
                });

                mediaRecorder.start();
                setIsRecording(true);
            })
            .catch((error) => {
                console.error("Error accessing microphone:", error);
            });
    };

    const stopRecording = () => {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!customerId) {
            setErrorMessage("Customer ID is required");
            return;
        }
        const formData = new FormData();
        formData.append("customerId", customerId);
        formData.append("labelName", labelName);
        formData.append("type", labelType);
        formData.append("textDescription", textDescription);
        formData.append("isPrivate", isPrivate);
        images.forEach((image) => formData.append("images", image));

        console.log("Submitting with Customer Id:", customerId);
        if (audio) formData.append("audio", audio);

        try {
            const response = await axios.post(`${apiUrl}/labels`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            alert("Label created successfully!");
            setErrorMessage("");

            const labelId = response.data.labelId;
            navigate(`/label/${customerId}/${labelId}`);
        } catch (error) {
            console.error("There was an error creating the label:", error);
            setErrorMessage("There was an error creating the label. Please try again.");
        }
    };

    return (
        <div className="create-label-container">
            <h2>Create a New Label</h2>
            <form onSubmit={handleSubmit}>
                {userRole === "admin" && (
                    <div>
                        <label htmlFor="customerId">Customer</label>
                        <select id="customerId" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                            <option value="">Select a customer</option>
                            {customers.map((customer) => (
                                <option key={customer.customer_id} value={customer.customer_id}>
                                    {customer.customer_id} - {customer.mail}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                {userRole === "user" && (
                    <div>
                        <p>Creating label for Customer ID: {customerId}</p>
                        <input type="hidden" name="customerId" value={customerId} />
                    </div>
                )}
                <div>
                    <label htmlFor="labelName">Label Name</label>
                    <input type="text" id="labelName" value={labelName} onChange={(e) => setLabelName(e.target.value)} required />
                </div>
                <div>
                    <label htmlFor="labelType">Label Type</label>
                    <select id="labelType" value={labelType} onChange={(e) => setLabelType(e.target.value)}>
                        <option value="fragile">Fragile</option>
                        <option value="heavy">Heavy</option>
                        <option value="standard">Standard</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="textDescription">Description</label>
                    <textarea id="textDescription" value={textDescription} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="isPrivate">Privacy</label>
                    <select id="isPrivate" value={isPrivate} onChange={(e) => setIsPrivate(e.target.value)}>
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="images">Images</label>
                    <input type="file" id="images" accept="image/*" multiple onChange={handleImageChange} />
                </div>
                <div>
                    <button type="button" onClick={startCamera}>
                        Start Camera
                    </button>
                    <video ref={videoRef} style={{ display: "none" }} autoPlay />
                    <button type="button" onClick={takePhoto}>
                        Take Photo
                    </button>
                </div>
                <div>
                    <label htmlFor="audio">Audio</label>
                    <input type="file" id="audio" accept="audio/*" onChange={handleAudioChange} />
                </div>
                <div>
                    {!isRecording ? (
                        <button type="button" onClick={startRecording}>
                            Start Recording
                        </button>
                    ) : (
                        <button type="button" onClick={stopRecording}>
                            Stop Recording
                        </button>
                    )}
                </div>
                <button type="submit">Create Label</button>
                {errorMessage && <p className="error-message">{errorMessage}</p>}
            </form>
        </div>
    );
}
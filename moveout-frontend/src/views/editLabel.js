import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

export default function EditLabel() {
    const { labelId } = useParams();
    const navigate = useNavigate();
    const apiUrl = process.env.REACT_APP_API_URL || "/api";
    const [customer_id, setCustomerId] = useState("");
    const [label_name, setLabelName] = useState("");
    const [labelType, setLabelType] = useState("standard");
    const [textDescription, setDescription] = useState("");
    const [isPrivate, setIsPrivate] = useState("public");
    const [images, setImages] = useState([]);
    const [audio, setAudio] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const fetchLabelData = async () => {
            try {
                const response = await axios.get(`${apiUrl}/labels/${labelId}`);
                const { customer_id, label_name, type, textDescription, isPrivate, imageUrls, audioUrl } = response.data;
                console.log("customerId: ", customer_id);
                console.log("labelName: ", label_name);
                console.log("type: ", type);
                console.log("textDescription: ", textDescription);
                console.log("isPrivate: ", isPrivate);
                setCustomerId(customer_id);
                setLabelName(label_name);
                setLabelType(type);
                setDescription(textDescription);
                setIsPrivate(isPrivate);
                setImages(imageUrls || []);
                if (audioUrl) {
                    setAudio({ name: "Current Audio", url: audioUrl });
                }
            } catch (error) {
                console.error("Error fetching label data:", error);
                setErrorMessage("Error fetching label data. Please try again.");
            }
        };

        fetchLabelData();
    }, [apiUrl, labelId]);

    const handleImageChange = (e) => {
        const selectedImages = Array.from(e.target.files);
        if (images.length + selectedImages.length > 5) {
            alert("You can upload a maximum of 5 images.");
            return;
        }
        setImages((prevImages) => [...prevImages, ...selectedImages]);
    };

    const handleRemoveImage = (index) => {
        setImages((prevImages) => prevImages.filter((_, i) => i !== index));
    };

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoRef.current.srcObject = mediaStream;
            videoRef.current.style.display = "block";
        } catch (error) {
            console.error("Error accessing camera:", error);
            setErrorMessage("Error accessing camera. Please check your permissions.");
        }
    };

    const takePhoto = () => {
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
            const newImage = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
            if (images.length < 5) {
                setImages((prevImages) => [...prevImages, newImage]);
            } else {
                alert("You can only upload up to 5 images.");
            }
        }, "image/jpeg");
    };

    const handleAudioChange = (e) => {
        const file = e.target.files[0];
        setAudio(file);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            const audioChunks = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
                const audioFile = new File([audioBlob], `audio_${Date.now()}.wav`, { type: "audio/wav" });
                setAudio(audioFile);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error starting audio recording:", error);
            setErrorMessage("Error starting audio recording. Please check your microphone permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append("customerId", customer_id);
        formData.append("labelName", label_name);
        formData.append("type", labelType);
        formData.append("textDescription", textDescription);
        formData.append("isPrivate", isPrivate);

        console.log("handleSubmit - label_name :", label_name);
        console.log("formData: ", formData);
        images.forEach((image) => {
            if (image instanceof File) {
                formData.append("images", image);
            } else if (typeof image === "string") {
                formData.append("existingImages", image);
            }
        });

        if (audio instanceof File) {
            formData.append("audio", audio);
        } else if (audio && audio.url) {
            formData.append("existingAudio", audio.url);
        }

        try {
            await axios.put(`${apiUrl}/labels/${labelId}`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            alert("Label updated successfully!");
            navigate(`/label/${customer_id}/${labelId}`);
        } catch (error) {
            console.error("There was an error updating the label:", error);
            setErrorMessage("There was an error updating the label. Please try again.");
        }
    };

    return (
        <div className="edit-label-container">
            <h2>Edit Label</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <p>Editing label for Customer ID: {customer_id}</p>
                    <input type="hidden" name="customerId" value={customer_id} />
                </div>
                <div>
                    <label htmlFor="labelName">Label Name</label>
                    <input type="text" id="labelName" value={label_name} onChange={(e) => setLabelName(e.target.value)} required />
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
                    <div>
                        {images &&
                            images.map((image, index) => (
                                <div key={index}>
                                    {typeof image === "string" ? <img src={image} alt={`Label ${index + 1}`} style={{ width: "100px", height: "100px", objectFit: "cover" }} /> : <span>{image.name}</span>}
                                    <button type="button" onClick={() => handleRemoveImage(index)}>
                                        Remove
                                    </button>
                                </div>
                            ))}
                    </div>
                </div>
                <div>
                    <button type="button" onClick={startCamera}>
                        Start Camera
                    </button>
                    <video ref={videoRef} autoPlay style={{ display: "none" }} />
                    <button type="button" onClick={takePhoto}>
                        Take Photo
                    </button>
                </div>
                <div>
                    <label htmlFor="audio">Upload Audio</label>
                    <input type="file" id="audio" accept="audio/*" onChange={handleAudioChange} />
                    <button type="button" onClick={isRecording ? stopRecording : startRecording}>
                        {isRecording ? "Stop Recording" : "Start Recording"}
                    </button>
                    {audio && (
                        <div>
                            {audio instanceof File ? (
                                <span>New audio: {audio.name}</span>
                            ) : (
                                <div>
                                    <span>Current audio: {audio.name}</span>
                                    <audio controls src={audio.url}>
                                        Your browser does not support the audio element.
                                    </audio>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <button type="submit">Update Label</button>
                {errorMessage && <p className="error-message">{errorMessage}</p>}
            </form>
        </div>
    );
}

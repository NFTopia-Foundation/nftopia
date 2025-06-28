"use client";

import { uploadFile } from "@/lib/utils";
import { useState } from "react";

export default function Page() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");

const handleSubmit = async (event: React.FormEvent) => {
  event.preventDefault();
  console.log("Submit triggered");

  if (!imageFile) {
    console.log("No image selected");
    return;
  }

  const ext = imageFile.name.split(".").pop();
  const filename = `${Date.now()}.${ext}`;
  console.log("Uploading file:", filename);

  try {
    const url = await uploadFile(imageFile, `item/${filename}`, setUploadProgress);
    console.log("File uploaded to:", url);
    setFileUrl(url || "");
    setImageFile(null);
  } catch (error) {
    console.error("Upload failed:", error);
  }
};

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col gap-3 items-center bg-white rounded-lg text-black p-4 shadow"
      >
        <h1 className="text-lg font-semibold">Upload your image</h1>
        <input
          type="file"
          id="imageFile"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setImageFile(e.target.files[0]);
              setUploadProgress(0);
              setFileUrl("");
            }
          }}
        />

        <button
          type="submit"
          className="w-full p-2 rounded-sm text-white bg-blue-500 hover:bg-blue-600"
        >
          Upload Image
        </button>

        {uploadProgress > 0 && (
          <p className="text-sm text-blue-600">Uploading: {uploadProgress}%</p>
        )}





        {fileUrl && (
          <div className="mt-3">
            <p className="text-sm text-green-600">Upload complete!</p>
            <img src={fileUrl} alt="Uploaded" className="w-32 h-auto rounded" />
          </div>
        )}
      </form>
    </div>
  );
}

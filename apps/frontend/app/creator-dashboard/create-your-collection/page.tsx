"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { API_CONFIG } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/stores";
import { uploadToFirebase } from "@/lib/firebase/uploadtofirebase";
import { getCookie } from "@/lib/CSRFTOKEN";
import { FileDropZone } from "@/lib";
import type { FileWithMeta } from "@/lib/interfaces";

interface CreateCollectionForm {
  name: string;
  description: string;
  bannerImage: File | null;
}

interface FormErrors {
  name?: string;
  description?: string;
  bannerImage?: string;
  general?: string;
}

export default function CreateYourCollection() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  
  const [form, setForm] = useState<CreateCollectionForm>({
    name: "",
    description: "",
    bannerImage: null,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [success, setSuccess] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithMeta[]>([]);

  console.log(form);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "Collection name is required";
    } else if (form.name.trim().length < 3) {
      newErrors.name = "Collection name must be at least 3 characters";
    } else if (form.name.trim().length > 50) {
      newErrors.name = "Collection name must be less than 50 characters";
    }

    if (!form.description.trim()) {
      newErrors.description = "Description is required";
    } else if (form.description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    } else if (form.description.trim().length > 500) {
      newErrors.description = "Description must be less than 500 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CreateCollectionForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!validateForm())  return;

    if (isUploadingImage) {
          setErrors({ general: "Please wait for image upload to complete" });
          return;
        }

    setErrors({});
    setIsLoading(true);

    try {
      const csrfToken = await getCookie();
      console.log(csrfToken)
      const res = await uploadToFirebase(selectedFiles[0].file).then((firebaseUrl: string) => {
        return fetch(`${API_CONFIG.baseUrl}/collections/create`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({ ...form, bannerImage: firebaseUrl }),
        });
      }).finally(() => {
        setIsUploadingImage(true);
      });

      if (!res.ok) throw new Error('Failed to create collection');

      setSuccess(true);
      showSuccess("Collection created successfully!");


      setForm({
        name: "",
        description: "",
        bannerImage: null,
      });
      setImagePreview(null);
      setUploadedImageUrl(null);
      setSelectedFiles([]);

      setTimeout(() => {
        router.push("/creator-dashboard/collections");
      }, 2000);
    } catch (error) {
      console.error("Error creating collection:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create collection";
      setErrors({ general: errorMessage });
      showError(errorMessage);
    } finally {
      setIsLoading(false);
      }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0c38] via-[#181359] to-[#241970] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900/60 border-gray-700/40 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Collection Created!</h2>
            <p className="text-gray-300 mb-4">
              Your collection has been successfully created. Redirecting to collections...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen mt-20 bg-gradient-to-b from-[#0f0c38] via-[#181359] to-[#241970] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Create Your Collection</h1>
          <p className="text-gray-300 text-lg">Showcase your NFTs in a beautiful collection</p>
        </div>

        {errors.general && (
          <Alert className="mb-6 border-red-500/50 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-200">{errors.general}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-gray-900/40 border-gray-700/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Collection Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Collection Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white font-medium">
                  Collection Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter collection name"
                  value={form.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={cn(
                    "bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400",
                    "focus:border-gray-500 focus:ring-gray-500/20",
                    errors.name && "border-red-500/70 focus:border-red-400"
                  )}
                  maxLength={50}
                />
                {errors.name && <p className="text-red-300 text-sm">{errors.name}</p>}
                <p className="text-gray-400 text-xs">{form.name.length}/50 characters</p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-white font-medium">
                  Description *
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe your collection..."
                  value={form.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className={cn(
                    "bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400",
                    "focus:border-gray-500 focus:ring-gray-500/20 min-h-[120px]",
                    errors.description && "border-red-500/70 focus:border-red-400"
                  )}
                  maxLength={500}
                />
                {errors.description && <p className="text-red-300 text-sm">{errors.description}</p>}
                <p className="text-gray-400 text-xs">{form.description.length}/500 characters</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-white font-medium mb-2">Upload Banner Image</label>
                  <FileDropZone
                    onFilesSelected={setSelectedFiles}
                    accept={['image/*']}
                    maxSizeMB={10}
                  />
              </div>
               <button
        onClick={handleSubmit}
        disabled={!form.name && !form.description && selectedFiles.length === 0}
        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold hover:from-purple-600 hover:to-blue-600 transition duration-200 disabled:opacity-50"
      >
        {isLoading ? 'Creating...' : 'Create Collection'}
      </button>

            </form>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            Need help? Check out our{" "}
            <a href="#" className="text-purple-400 hover:text-purple-300 underline transition-colors">
              collection creation guide
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

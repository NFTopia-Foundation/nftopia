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

    // if (!form.bannerImage && !uploadedImageUrl) {
    //   newErrors.bannerImage = "Banner image is required";
    // } else if (form.bannerImage) {
    //   const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    //   if (!validTypes.includes(form.bannerImage.type)) {
    //     newErrors.bannerImage = "Please upload a valid image file (JPEG, PNG, or WebP)";
    //   } else if (form.bannerImage.size > 10 * 1024 * 1024) {
    //     newErrors.bannerImage = "Image size must be less than 10MB";
    //   }
    // }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CreateCollectionForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // const handleFilesSelected = async (files: FileWithMeta[]) => {
  //   if (files.length === 0) return;

  //   const file = files[0].file;
  //   setSelectedFiles(files);
  //   setForm((prev) => ({ ...prev, bannerImage: file }));

  //   // Create preview
  //   const reader = new FileReader();
  //   reader.onload = (e) => {
  //     setImagePreview(e.target?.result as string);
  //   };
  //   reader.readAsDataURL(file);

  //   if (errors.bannerImage) {
  //     setErrors((prev) => ({ ...prev, bannerImage: undefined }));
  //   }

  //   // Upload to Firebase
  //   try {
  //     setIsUploadingImage(true);
  //     const imageUrl = await uploadToFirebase(file);
  //     setUploadedImageUrl(imageUrl);
  //   } catch (error) {
  //     console.error("Error uploading image:", error);
  //     setErrors((prev) => ({
  //       ...prev,
  //       bannerImage: error instanceof Error ? error.message : "Failed to upload image",
  //     }));
  //   } finally {
  //     setIsUploadingImage(false);
  //   }
  // };




  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();
    // if (selectedImages.length === 0) return;

    if (!validateForm())  return;

    // setLoading(true);
    // setMessage('');

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


      //  Reset form
      setForm({
        name: "",
        description: "",
        bannerImage: null,
      });
      setImagePreview(null);
      setUploadedImageUrl(null);
      setSelectedFiles([]);

      // Redirect after success
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


  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();

  //   if (!validateForm()) {
  //     return;
  //   }

  //   if (isUploadingImage) {
  //     setErrors({ general: "Please wait for image upload to complete" });
  //     return;
  //   }

  //   setErrors({});
  //   setIsLoading(true);

  //   try {
  //     const csrfToken = await getCookie();
  //     const collectionData = {
  //       name: form.name.trim(),
  //       description: form.description.trim(),
  //       bannerImage: uploadedImageUrl,
  //     };

  //     const response = await fetch(`${API_CONFIG.baseUrl}/collections/create`, {
  //       method: "POST",
  //       credentials: "include",
  //       headers: {
  //         "Content-Type": "application/json",
  //         "X-CSRF-Token": csrfToken,
  //       },
  //       body: JSON.stringify(collectionData),
  //     });

  //     if (!response.ok) {
  //       throw new Error("Failed to create collection");
  //     }

  //     setSuccess(true);
  //     showSuccess("Collection created successfully!");

  //     // Reset form
  //     setForm({
  //       name: "",
  //       description: "",
  //       bannerImage: null,
  //     });
  //     setImagePreview(null);
  //     setUploadedImageUrl(null);
  //     setSelectedFiles([]);

  //     // Redirect after success
  //     setTimeout(() => {
  //       router.push("/collections");
  //     }, 2000);
  //   } catch (error) {
  //     console.error("Error creating collection:", error);
  //     const errorMessage = error instanceof Error ? error.message : "Failed to create collection";
  //     setErrors({ general: errorMessage });
  //     showError(errorMessage);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

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

              {/* Banner Image Upload */}
              {/* <div className="space-y-2">
                <Label className="text-white font-medium">Banner Image *</Label>
                <div className="space-y-4">
                  {imagePreview ? (
                    <div className="relative group">
                      <img
                        src={imagePreview}
                        alt="Banner preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <FileDropZone
                          onFilesSelected={handleFilesSelected}
                          accept={['image/*']}
                          maxSizeMB={10}
                          className="w-full h-full border-none"
                          dropZoneText="Drop new image to replace"
                          dropZoneTextClass="text-white"
                        />
                      </div>
                      {uploadedImageUrl && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                          ✓ Uploaded
                        </div>
                      )}
                    </div>
                  ) : (
                    <FileDropZone
                      onFilesSelected={handleFilesSelected}
                      accept={['image/*']}
                      maxSizeMB={10}
                      className={cn(
                        "border-2 border-dashed rounded-lg transition-colors",
                        errors.bannerImage
                          ? "border-red-500/50 bg-red-500/5"
                          : "border-gray-600/50 bg-gray-800/20 hover:bg-gray-800/30"
                      )}
                      dropZoneText="Drag & drop banner image here"
                      dropZoneTextClass={errors.bannerImage ? "text-red-300" : "text-gray-300"}
                      disabled={isUploadingImage}
                    />
                  )}
                  {isUploadingImage && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading image...</span>
                    </div>
                  )}
                  {errors.bannerImage && <p className="text-red-300 text-sm">{errors.bannerImage}</p>}
                </div>
              </div> */}

              <div className="mb-6">
                <label className="block text-sm text-white font-medium mb-2">Upload Banner Image</label>
                  <FileDropZone
                    onFilesSelected={setSelectedFiles}
                    accept={['image/*']}
                    maxSizeMB={10}
                  />
              </div>

              {/* Submit Button */}
              {/* <div className="pt-6">
                <Button
                  type="submit"
                  disabled={isLoading || isUploadingImage || !uploadedImageUrl}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-[1.02] disabled:scale-100 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Collection...
                    </>
                  ) : isUploadingImage ? (
                    "Uploading Image..."
                  ) : (
                    "Create Collection"
                  )}
                </Button>
              </div> */}
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










// "use client"

// import type React from "react"
// import { useState } from "react"
// import { useRouter } from "next/navigation"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Textarea } from "@/components/ui/textarea"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Label } from "@/components/ui/label"
// import { Alert, AlertDescription } from "@/components/ui/alert"
// import { Upload, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
// import { API_CONFIG } from "@/lib/config"
// import { cn } from "@/lib/utils"
// import { useCollections, useToast } from "@/lib/stores"
// import type { JSX } from "react"

// interface CreateCollectionForm {
//   name: string
//   description: string
//   bannerImage: File | null
// }

// interface FormErrors {
//   name?: string
//   description?: string
//   bannerImage?: string
//   general?: string
// }

// export default function CreateYourCollection(): JSX.Element {
//   const router = useRouter()
//   const { createCollection, loading } = useCollections()
//   const { showSuccess, showError } = useToast()
  
//   const [form, setForm] = useState<CreateCollectionForm>({
//     name: "",
//     description: "",
//     bannerImage: null,
//   })
//   const [errors, setErrors] = useState<FormErrors>({})
//   const [isUploadingImage, setIsUploadingImage] = useState(false)
//   const [success, setSuccess] = useState(false)
//   const [imagePreview, setImagePreview] = useState<string | null>(null)
//   const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
//   const [backendAvailable, setBackendAvailable] = useState(true)

//   const validateForm = (): boolean => {
//     const newErrors: FormErrors = {}

//     // Name validation
//     if (!form.name.trim()) {
//       newErrors.name = "Collection name is required"
//     } else if (form.name.trim().length < 3) {
//       newErrors.name = "Collection name must be at least 3 characters"
//     } else if (form.name.trim().length > 50) {
//       newErrors.name = "Collection name must be less than 50 characters"
//     }

//     // Description validation
//     if (!form.description.trim()) {
//       newErrors.description = "Description is required"
//     } else if (form.description.trim().length < 10) {
//       newErrors.description = "Description must be at least 10 characters"
//     } else if (form.description.trim().length > 500) {
//       newErrors.description = "Description must be less than 500 characters"
//     }

//     // Banner image validation
//     if (!form.bannerImage && !uploadedImageUrl) {
//       newErrors.bannerImage = "Banner image is required"
//     } else if (form.bannerImage) {
//       const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
//       if (!validTypes.includes(form.bannerImage.type)) {
//         newErrors.bannerImage = "Please upload a valid image file (JPEG, PNG, or WebP)"
//       } else if (form.bannerImage.size > 10 * 1024 * 1024) {
//         // 10MB limit
//         newErrors.bannerImage = "Image size must be less than 10MB"
//       }
//     }

//     setErrors(newErrors)
//     return Object.keys(newErrors).length === 0
//   }

//   const handleInputChange = (field: keyof CreateCollectionForm, value: string) => {
//     setForm((prev) => ({ ...prev, [field]: value }))
//     // Clear error when user starts typing
//     if (errors[field]) {
//       setErrors((prev) => ({ ...prev, [field]: undefined }))
//     }
//   }

//   const uploadImageToFirebase = async (file: File): Promise<string> => {
//     const formData = new FormData()
//     formData.append("image", file)

//     const response = await fetch(`${API_CONFIG.baseUrl}/upload/image`, {
//       method: "POST",
//       body: formData,
//       signal: AbortSignal.timeout(30000), // 30 second timeout for uploads
//     })

//     if (!response.ok) {
//       const errorData = await response.json().catch(() => ({}))
//       throw new Error(errorData.message || "Failed to upload image")
//     }

//     const result = await response.json()
//     return result.imageUrl
//   }

//   const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0]
//     if (!file) return

//     // Set the file in form state
//     setForm((prev) => ({ ...prev, bannerImage: file }))

//     // Create preview
//     const reader = new FileReader()
//     reader.onload = (e) => {
//       setImagePreview(e.target?.result as string)
//     }
//     reader.readAsDataURL(file)

//     // Clear error
//     if (errors.bannerImage) {
//       setErrors((prev) => ({ ...prev, bannerImage: undefined }))
//     }

//     // Check if backend is available before attempting upload
//     try {
//       const healthCheck = await fetch(`${API_CONFIG.baseUrl}/health`, {
//         method: "GET",
//         signal: AbortSignal.timeout(5000),
//       }).catch(() => null)

//       if (!healthCheck || !healthCheck.ok) {
//         setBackendAvailable(false)
//         setErrors((prev) => ({
//           ...prev,
//           bannerImage: "Backend server is not available. Please ensure the server is running on port 9000.",
//         }))
//         return
//       }

//       setBackendAvailable(true)

//       // Upload to Firebase via backend
//       setIsUploadingImage(true)
//       const imageUrl = await uploadImageToFirebase(file)
//       setUploadedImageUrl(imageUrl)
//     } catch (error) {
//       console.error("Error uploading image:", error)
//       setBackendAvailable(false)
//       setErrors((prev) => ({
//         ...prev,
//         bannerImage:
//           error instanceof Error
//             ? error.message
//             : "Failed to upload image. Please check if the backend server is running.",
//       }))
//     } finally {
//       setIsUploadingImage(false)
//     }
//   }

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()

//     if (!validateForm()) {
//       return
//     }

//     // If image is still uploading, wait for it
//     if (isUploadingImage) {
//       setErrors({ general: "Please wait for image upload to complete" })
//       return
//     }

//     if (!backendAvailable) {
//       setErrors({ general: "Backend server is not available. Please ensure the server is running on port 9000." })
//       return
//     }

//     setErrors({})

//     try {
//       const collectionData = {
//         name: form.name.trim(),
//         description: form.description.trim(),
//         bannerImage: uploadedImageUrl || undefined,
//         nftCount: 0,
//         floorPrice: 0,
//         totalVolume: 0,
//       }

//       await createCollection(collectionData)

//       setSuccess(true)
//       showSuccess("Collection created successfully!")

//       // Reset form
//       setForm({
//         name: "",
//         description: "",
//         bannerImage: null,
//       })
//       setImagePreview(null)
//       setUploadedImageUrl(null)

//       // Redirect after success
//       setTimeout(() => {
//         router.push("/auth/logged-in")
//       }, 2000)
//     } catch (error) {
//       console.error("Error creating collection:", error)
//       const errorMessage = error instanceof Error ? error.message : "Failed to create collection"
//       setErrors({ general: errorMessage })
//       showError(errorMessage)
//     }
//   }

//   if (success) {
//     return (
//       <div className="min-h-screen bg-gradient-to-b from-[#0f0c38] via-[#181359] to-[#241970] flex items-center justify-center p-4">
//         <Card className="w-full max-w-md bg-gray-900/60 border-gray-700/40 backdrop-blur-sm">
//           <CardContent className="p-8 text-center">
//             <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
//             <h2 className="text-2xl font-bold text-white mb-2">Collection Created!</h2>
//             <p className="text-gray-300 mb-4">
//               Your collection has been successfully created. Redirecting to marketplace...
//             </p>
//           </CardContent>
//         </Card>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen mt-20 bg-gradient-to-b from-[#0f0c38] via-[#181359] to-[#241970] py-12 px-4">
//       <div className="max-w-2xl mx-auto">
//         <div className="text-center mb-8">
//           <h1 className="text-4xl font-bold text-white mb-4">Create Your Collection</h1>
//           <p className="text-gray-300 text-lg">Showcase your NFTs in a beautiful collection</p>
//         </div>

//         {!backendAvailable && (
//           <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
//             <AlertCircle className="h-4 w-4 text-yellow-400" />
//             <AlertDescription className="text-yellow-200">
//               Backend server is not available. Please ensure the server is running on port 9000.
//             </AlertDescription>
//           </Alert>
//         )}

//         <Card className="bg-gray-900/40 border-gray-700/30 backdrop-blur-sm">
//           <CardHeader>
//             <CardTitle className="text-white text-2xl">Collection Details</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <form onSubmit={handleSubmit} className="space-y-6">
//               {/* General Error */}
//               {errors.general && (
//                 <Alert className="border-red-500/50 bg-red-500/10">
//                   <AlertCircle className="h-4 w-4 text-red-400" />
//                   <AlertDescription className="text-red-300">{errors.general}</AlertDescription>
//                 </Alert>
//               )}

//               {/* Collection Name */}
//               <div className="space-y-2">
//                 <Label htmlFor="name" className="text-white font-medium">
//                   Collection Name *
//                 </Label>
//                 <Input
//                   id="name"
//                   type="text"
//                   placeholder="Enter collection name"
//                   value={form.name}
//                   onChange={(e) => handleInputChange("name", e.target.value)}
//                   className={cn(
//                     "bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400",
//                     "focus:border-gray-500 focus:ring-gray-500/20",
//                     errors.name && "border-red-500/70 focus:border-red-400",
//                   )}
//                   maxLength={50}
//                 />
//                 {errors.name && <p className="text-red-300 text-sm">{errors.name}</p>}
//                 <p className="text-gray-400 text-xs">{form.name.length}/50 characters</p>
//               </div>

//               {/* Description */}
//               <div className="space-y-2">
//                 <Label htmlFor="description" className="text-white font-medium">
//                   Description *
//                 </Label>
//                 <Textarea
//                   id="description"
//                   placeholder="Describe your collection..."
//                   value={form.description}
//                   onChange={(e) => handleInputChange("description", e.target.value)}
//                   className={cn(
//                     "bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400",
//                     "focus:border-gray-500 focus:ring-gray-500/20 min-h-[120px]",
//                     errors.description && "border-red-500/70 focus:border-red-400",
//                   )}
//                   maxLength={500}
//                 />
//                 {errors.description && <p className="text-red-300 text-sm">{errors.description}</p>}
//                 <p className="text-gray-400 text-xs">{form.description.length}/500 characters</p>
//               </div>

//               {/* Banner Image Upload */}
//               <div className="space-y-2">
//                 <Label className="text-white font-medium">Banner Image *</Label>
//                 <div className="space-y-4">
//                   {/* Upload Area */}
//                   <div
//                     className={cn(
//                       "border-2 border-dashed rounded-lg p-8 text-center transition-colors relative",
//                       "hover:border-gray-500/70 cursor-pointer",
//                       errors.bannerImage
//                         ? "border-red-500/50 bg-red-500/5"
//                         : "border-gray-600/50 bg-gray-800/20 hover:bg-gray-800/30",
//                       (isUploadingImage || !backendAvailable) && "pointer-events-none opacity-75",
//                     )}
//                     onClick={() =>
//                       backendAvailable && !isUploadingImage && document.getElementById("banner-upload")?.click()
//                     }
//                   >
//                     <input
//                       id="banner-upload"
//                       type="file"
//                       accept="image/*"
//                       onChange={handleImageChange}
//                       className="hidden"
//                       disabled={isUploadingImage || !backendAvailable}
//                     />

//                     {isUploadingImage ? (
//                       <div className="space-y-4">
//                         <Loader2 className="w-12 h-12 text-gray-400 mx-auto animate-spin" />
//                         <div>
//                           <p className="text-white font-medium">Uploading Image...</p>
//                           <p className="text-gray-400 text-sm">Please wait while we process your image</p>
//                         </div>
//                       </div>
//                     ) : imagePreview ? (
//                       <div className="space-y-4">
//                         <div className="relative">
//                           <img
//                             src={imagePreview || "/placeholder.svg"}
//                             alt="Banner preview"
//                             className="max-h-48 mx-auto rounded-lg object-cover"
//                           />
//                           {uploadedImageUrl && (
//                             <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
//                               ✓ Uploaded
//                             </div>
//                           )}
//                         </div>
//                         <p className="text-gray-300 text-sm">
//                           {backendAvailable ? "Click to change image" : "Backend unavailable"}
//                         </p>
//                       </div>
//                     ) : (
//                       <div className="space-y-4">
//                         <Upload className="w-12 h-12 text-gray-400 mx-auto" />
//                         <div>
//                           <p className="text-white font-medium">Upload Banner Image</p>
//                           <p className="text-gray-400 text-sm">
//                             {backendAvailable ? "PNG, JPG, or WebP. Max 10MB." : "Backend server required for upload"}
//                           </p>
//                         </div>
//                       </div>
//                     )}
//                   </div>

//                   {errors.bannerImage && <p className="text-red-300 text-sm">{errors.bannerImage}</p>}
//                 </div>
//               </div>

//               {/* Submit Button */}
//               <div className="pt-6">
//                 <Button
//                   type="submit"
//                   disabled={loading.creating || isUploadingImage || !uploadedImageUrl || !backendAvailable}
//                   className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-[1.02] disabled:scale-100 disabled:opacity-50"
//                 >
//                   {loading.creating ? (
//                     <>
//                       <Loader2 className="w-4 h-4 mr-2 animate-spin" />
//                       Creating Collection...
//                     </>
//                   ) : isUploadingImage ? (
//                     "Uploading Image..."
//                   ) : !backendAvailable ? (
//                     "Backend Unavailable"
//                   ) : (
//                     "Create Collection"
//                   )}
//                 </Button>
//               </div>
//             </form>
//           </CardContent>
//         </Card>

//         {/* Help Text */}
//         <div className="mt-8 text-center">
//           <p className="text-gray-400 text-sm">
//             Need help? Check out our{" "}
//             <a href="#" className="text-purple-400 hover:text-purple-300 underline transition-colors">
//               collection creation guide
//             </a>
//           </p>
//         </div>
//       </div>
//     </div>
//   )
// }

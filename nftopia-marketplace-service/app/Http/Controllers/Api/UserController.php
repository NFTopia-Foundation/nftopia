<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{


    public function index(Request $request): JsonResponse
    {
        $currentUser = $request->user();

        $currentUserUuid = $currentUser->user_uuid;
        
        return response()->json([
            'message' => 'Users retrieved successfully.',
            'current_user_uuid' => $currentUserUuid,
            'users' => User::all(),
        ], 200);
    }
    /**
     * Store a newly created user in storage.
     * This method handles the "Create" functionality.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
                'password' => ['required', 'string', 'min:8', 'confirmed'], // 'confirmed' requires a password_confirmation field
            ]);

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password), 
            ]);

            return response()->json([
                'message' => 'User created successfully.',
                'user' => $user,
            ], 201); 

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Error.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred while creating the user.',
                'error' => $e->getMessage(),
            ], 500); 
        }
    }

    /**
     * Update the specified user in storage.
     *
     * @param Request $request
     * @param User $user The user model instance to update (Route Model Binding)
     * @return JsonResponse
     */
     public function update(Request $request, User $user): JsonResponse
    {
        try {
            $request->validate([
                'name' => ['sometimes', 'string', 'max:255'],
                'email' => ['sometimes', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
                'password' => ['sometimes', 'string', 'min:8', 'confirmed'],
            ]);

            $user->name = $request->input('name', $user->name);
            $user->email = $request->input('email', $user->email);

            $passwordChanged = false;
            if ($request->filled('password')) {
                $user->password = Hash::make($request->password);
                $passwordChanged = true;
            }

            $user->save();

            if ($passwordChanged) {
                $user->tokens()->delete(); 
            }

            return response()->json([
                'message' => 'User updated successfully.' . ($passwordChanged ? ' All tokens revoked due to password change.' : ''),
                'user' => $user,
            ], 200);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Error.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred while updating the user.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
    /**
     * Remove the specified user from storage.
     * This method handles the "Delete" functionality.
     *
     * @param User $user The user model instance to delete (Route Model Binding)
     * @return JsonResponse
     */
    public function destroy(User $user): JsonResponse
    {
        try {
            $user->delete();

            return response()->json([
                'message' => 'User deleted successfully.',
            ], 200); 

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred while deleting the user.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

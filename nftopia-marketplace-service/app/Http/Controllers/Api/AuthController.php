<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\JsonResponse; 

class AuthController extends Controller
{
    /**
     * Handle an incoming authentication request.
     * This method logs in a user and issues a Sanctum API token.
     *
     * @param Request $request
     * @return JsonResponse
     */

    public function login(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'email' => ['required', 'string', 'email'],
                'password' => ['required', 'string'],
            ]);

            if (!Auth::attempt($request->only('email', 'password'))) {
             
                throw ValidationException::withMessages([
                    'email' => [__('auth.failed')], 
                ]);
            }

            $user = Auth::user();

            $user->load('roles', 'permissions');

            $token = $user->createToken('auth_token', ['*'], now()->addMinutes(120))->plainTextToken;

            return response()->json([
                'message' => 'Login successful.',
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user_uuid' => $user->user_uuid, 
                'user' => $user->only(['name', 'email', 'roles', 'permissions']), // Return a cleaner user object
            ], 200);

        } catch (ValidationException $e) {

            return response()->json([
                'message' => 'Authentication failed.',
                'errors' => $e->errors(),
            ], 401); 
        } catch (\Exception $e) {
                
            return response()->json([
                'message' => 'An unexpected error occurred during login.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
    /**
     * Log the user out (revoke the current token).
     * This method requires the user to be authenticated with a Sanctum token.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function logout(Request $request): JsonResponse
    {
        try {
           
            $request->user()->currentAccessToken()->delete();

            return response()->json([
                'message' => 'Logged out successfully. Token revoked.',
            ], 200);

        } catch (\Exception $e) {
        
            return response()->json([
                'message' => 'An error occurred during logout.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get the authenticated user's details.
     * This method requires the user to be authenticated with a Sanctum token.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function user(Request $request): JsonResponse
    {
        try {
            return response()->json([
                'message' => 'User details retrieved successfully.',
                'user' => $request->user(),
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred while retrieving user details.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

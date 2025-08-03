<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate; 

class AdminUserController extends Controller
{
    /**
     * Revoke all API tokens for a specific user (admin-triggered).
     *
     * @param User $user The user model instance whose tokens are to be revoked.
     * @return JsonResponse
     */
    public function revokeTokens(User $user): JsonResponse
    {
    
        if (Gate::denies('revoke-user-tokens')) {
            return response()->json([
                'message' => 'You are not authorized to perform this action.',
            ], 403); 
        }
       
        try {
            $user->tokens()->delete();

            return response()->json([
                'message' => "All tokens for user {$user->email} revoked successfully.",
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred while revoking tokens.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

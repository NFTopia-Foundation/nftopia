<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TransactionService;
use App\Model\Transaction;
use Illuminate\Http\Request;
use App\Http\Controllers\Requests\TransactionRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use Exception;

class TransactionController extends Controller
{
    public function __construct(private readonly TransactionService $transactionService){}

    public function index(TransactionRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();

            $perPage = $validated['per_page'] ?? 15;
            unset($validated['per_page']);

            $transactions = $this->transactionService->getAllTransactions($validated, $perPage);

            return response()->json([
                'success' => true,
                'data' => $transactions,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function store(TransactionRequest $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                
            ]);

            $transaction = $this->transactionService->createTransaction($validated);

            return response()->json([
                'success' => true,
                'message' => 'Transaction created successfully',
                'data' => $transaction->load('listing'),
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function show(Transaction $transaction): JsonResponse
    {
        try {
            
            $transaction = $this->transactionService->getTransaction($transaction->id);

            return response()->json([
                'success' => true,
                'data' => $transaction,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Transaction not found',
            ], 404);
        }
    }

    /**
     * Get transaction by blockchain hash
     */
    public function getByHash(Transaction $Transaction): JsonResponse
    {
        try {
            $transaction = $this->transactionService->getTransactionByHash($Transaction->blockchain_tx_hash);

            if (!$transaction) {
                return response()->json([
                    'success' => false,
                    'message' => 'Transaction not found',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $transaction,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get transactions for a buyer
     */
    public function getBuyerTransactions(Request $request, Transaction $Transaction): JsonResponse
    {
        try {
            $perPage = $request->get('per_page', 15);
            $transactions = $this->transactionService->getTransactionsForBuyer($Transaction->buyer_id, $perPage);

            return response()->json([
                'success' => true,
                'data' => $transactions,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get transactions for a seller
     */
    public function getSellerTransactions(Request $request, string $sellerId): JsonResponse
    {
        try {
            $perPage = $request->get('per_page', 15);
            $transactions = $this->transactionService->getTransactionsForSeller($sellerId, $perPage);

            return response()->json([
                'success' => true,
                'data' => $transactions,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get transaction statistics
     */
    public function getStats(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
            ]);

            $stats = $this->transactionService->getTransactionStats($validated);

            return response()->json([
                'success' => true,
                'data' => $stats,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get daily transaction volume
     */
    public function getDailyVolume(Request $request): JsonResponse
    {
        try {
            $days = $request->get('days', 30);
            $volumeData = $this->transactionService->getDailyVolume($days);

            return response()->json([
                'success' => true,
                'data' => $volumeData,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
<?php

namespace App\Http\Controllers\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'buyer_id' => 'required|uuid',
            'min_price' => 'nullable|numeric|min:0',
            'max_price' => 'nullable|numeric|min:0',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'contract_address' => ['nullable', 'string', 'regex:/^0x[a-fA-F0-9]{40}$/'],
            'sort_by' => ['nullable', Rule::in(['created_at', 'final_price'])],
            'sort_order' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => 'nullable|integer|min:1|max:100',
            'listing_id' => 'required|uuid|exists:nft_listings,id',
            'payment_service_id' => 'required|string|max:36',
            'final_price' => ['required', 'numeric', 'regex:/^\d+(\.\d{1,18})?$/', 'min:0.000000000000000001'],
            'royalty_percentage' => ['nullable', 'numeric', 'min:0', 'max:100', 'regex:/^\d+(\.\d{1,2})?$/'],
            'blockchain_tx_hash' => ['required', 'string', 'regex:/^0x[a-fA-F0-9]{64}$/'],
            'bid_id' => 'nullable|uuid|exists:bids,id',
        ];
    }
}
<?php

namespace App\Http\Controllers\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'listing_type' => ['nullable', Rule::in(['fixed_price', 'auction'])],
            'seller_id' => 'nullable|uuid',
            'min_price' => 'nullable|numeric|min:0',
            'max_price' => 'nullable|numeric|min:0',
            'contract_address' => ['nullable', 'string', 'regex:/^0x[a-fA-F0-9]{40}$/'],
            'sort_by' => ['nullable', Rule::in(['created_at', 'price', 'auction_end'])],
            'sort_order' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => 'nullable|integer|min:1|max:100',
            'nft_contract_address' => ['required', 'string', 'regex:/^0x[a-fA-F0-9]{40}$/'],
            'token_id' => 'required|string|max:78',
            'price' => ['required', 'numeric', 'regex:/^\d+(\.\d{1,18})?$/', 'min:0.000000000000000001'],
            'auction_end' => 'nullable|date|after:now',
            'query' => 'required|string|min:1|max:255',
        ];
    }
}
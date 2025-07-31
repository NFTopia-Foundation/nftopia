<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateListingRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'price' => 'sometimes|numeric|min:' . config('marketplace.min_listing_price', 0.01),
            'auction_end' => 'sometimes|nullable|date|after:now',
            'status' => 'sometimes|in:cancelled',
        ];
    }
}

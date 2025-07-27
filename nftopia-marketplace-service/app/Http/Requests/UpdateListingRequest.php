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
            'price' => 'sometimes|numeric|min:0.01',
            'auction_end' => 'nullable|date|after:now',
            'royalty_percentage' => 'sometimes|numeric|min:0|max:100',
        ];
    }
}

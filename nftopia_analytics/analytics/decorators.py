# decorators.py
from django.contrib.admin.views.decorators import staff_member_required
from django.core.exceptions import PermissionDenied

def analyst_required(view_func):
    @staff_member_required
    def _wrapped_view(request, *args, **kwargs):
        if not (request.user.is_superuser or request.user.groups.filter(name='Analysts').exists()):
            raise PermissionDenied
        return view_func(request, *args, **kwargs)
    return _wrapped_view
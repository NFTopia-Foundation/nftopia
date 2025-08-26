from django.http import HttpResponse


def defaultView(request):
    return HttpResponse("Hello! This is the default page.")
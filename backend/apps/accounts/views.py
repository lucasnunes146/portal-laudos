import io
import pyotp
import qrcode
import qrcode.image.svg
from base64 import b64encode
from django.contrib.auth import logout
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import User
from .serializers import (
    LoginSerializer, UserSerializer,
    ChangePasswordSerializer, TOTPVerifySerializer
)


class LoginRateThrottle(AnonRateThrottle):
    rate = '5/min'


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data['user']

    if user.totp_enabled and user.is_staff_member:
        # Return partial token indicating 2FA required
        return Response({
            'requires_2fa': True,
            'user_id': user.id,
            'message': 'Código 2FA necessário.'
        })

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
        'requires_2fa': False,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_2fa_login(request):
    user_id = request.data.get('user_id')
    code = request.data.get('code')
    password = request.data.get('password')
    username = request.data.get('username')

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Usuário não encontrado.'}, status=400)

    if not user.verify_totp(code):
        return Response({'error': 'Código 2FA inválido.'}, status=400)

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except TokenError:
        pass
    return Response({'message': 'Logout realizado com sucesso.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    request.user.set_password(serializer.validated_data['new_password'])
    request.user.save()
    return Response({'message': 'Senha alterada com sucesso.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def totp_setup_view(request):
    user = request.user
    if not user.totp_secret:
        user.totp_secret = pyotp.random_base32()
        user.save()

    uri = user.get_totp_uri()

    # Generate QR code as base64 PNG
    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_b64 = b64encode(buffer.getvalue()).decode()

    return Response({
        'secret': user.totp_secret,
        'uri': uri,
        'qr_image': f'data:image/png;base64,{qr_b64}',
        'already_enabled': user.totp_enabled,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def totp_verify_view(request):
    serializer = TOTPVerifySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = request.user
    code = serializer.validated_data['code']
    action = serializer.validated_data['action']

    if not user.verify_totp(code):
        return Response({'error': 'Código inválido.'}, status=400)

    if action == 'enable':
        user.totp_enabled = True
        user.save()
        return Response({'message': '2FA ativado com sucesso.'})

    return Response({'message': 'Código válido.'})

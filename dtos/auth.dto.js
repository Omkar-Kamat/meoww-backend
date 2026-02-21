export class AuthResponseDTO {
  constructor(data) {
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    this.message = data.message;
  }

  static fromTokens(accessToken, refreshToken, message = 'Authentication successful') {
    return new AuthResponseDTO({ accessToken, refreshToken, message });
  }
}

export class RegisterResponseDTO {
  constructor(message) {
    this.message = message;
  }

  static success() {
    return new RegisterResponseDTO('Registration successful. OTP sent for verification.');
  }
}

export class VerifyAccountResponseDTO {
  constructor(data) {
    this.message = data.message;
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
  }

  static fromTokens(accessToken, refreshToken) {
    return new VerifyAccountResponseDTO({
      message: 'Account verified successfully',
      accessToken,
      refreshToken,
    });
  }
}

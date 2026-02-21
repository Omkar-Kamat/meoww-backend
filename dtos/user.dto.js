export class UserDTO {
  constructor(user) {
    this.id = user._id;
    this.fullName = user.fullName;
    this.email = user.email;
    this.role = user.role;
    this.isVerified = user.isVerified;
    this.createdAt = user.createdAt;
  }

  static fromModel(user) {
    return new UserDTO(user);
  }

  static fromModels(users) {
    return users.map(user => new UserDTO(user));
  }
}

export class UserProfileDTO extends UserDTO {
  constructor(user) {
    super(user);
    this.registrationNumber = user.registrationNumber;
    this.mobileNumber = user.mobileNumber;
    this.profilePicture = user.profilePicture;
    this.bio = user.bio;
  }

  static fromModel(user) {
    return new UserProfileDTO(user);
  }
}

export class PublicUserDTO {
  constructor(user) {
    this.id = user._id;
    this.fullName = user.fullName;
    this.profilePicture = user.profilePicture;
    this.bio = user.bio;
  }

  static fromModel(user) {
    return new PublicUserDTO(user);
  }
}

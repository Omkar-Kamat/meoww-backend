export class MatchSessionDTO {
  constructor(session) {
    this.id = session._id;
    this.status = session.status;
    this.createdAt = session.createdAt;
    this.endedAt = session.endedAt;
  }

  static fromModel(session) {
    return new MatchSessionDTO(session);
  }

  static fromModels(sessions) {
    return sessions.map(session => new MatchSessionDTO(session));
  }
}

export class MatchSessionDetailDTO extends MatchSessionDTO {
  constructor(session, currentUserId) {
    super(session);
    this.partnerId = session.userA.toString() === currentUserId 
      ? session.userB 
      : session.userA;
  }

  static fromModel(session, currentUserId) {
    return new MatchSessionDetailDTO(session, currentUserId);
  }
}

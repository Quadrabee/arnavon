export default class Email {
  constructor(data) {
    Object.assign(this, data);
  }

  // For finitio contracts
  static json(data) {
    return new Email(data);
  }
}

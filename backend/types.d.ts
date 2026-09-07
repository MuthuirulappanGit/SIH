declare module "bcryptjs" {
  const bcrypt: {
    compare(value: string, hash: string): Promise<boolean>;
    hash(value: string, rounds: number): Promise<string>;
  };
  export default bcrypt;
}
export type user =  {
    id: string,
    username: string,
    password_hash: string,
    display_name: string,
    role: Role,
    active: boolean
} | null;


enum Role {
  "ADMIN",
  "PACKAGER",
  "GREETER",
  "CASHIER",
  "RUNNER"
}
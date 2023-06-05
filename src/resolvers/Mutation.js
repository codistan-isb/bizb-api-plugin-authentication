import password_1 from "@accounts/password";
import server_1 from "@accounts/server";

export default {
    createUser: async (_, { user }, ctx) => {
        const { injector, infos, collections } = ctx;
        const { Accounts, users } = collections;
        // console.log("user", user);
        const accountsServer = injector.get(server_1.AccountsServer);
        const accountsPassword = injector.get(password_1.AccountsPassword);
        let userId;
        try {
            userId = await accountsPassword.createUser(user);
        } catch (error) {
            // If ambiguousErrorMessages is true we obfuscate the email or username already exist error
            // to prevent user enumeration during user creation
            if (
                accountsServer.options.ambiguousErrorMessages &&
                error instanceof server_1.AccountsJsError &&
                (error.code === password_1.CreateUserErrors.EmailAlreadyExists ||
                    error.code === password_1.CreateUserErrors.UsernameAlreadyExists)
            ) {
                return {};
            }
            throw error;
        }

        // console.log("userId", userId);
        if (userId) {
            // console.log("user", user);
            const account = {
                _id: userId,
                acceptsMarketing: false,
                emails: [
                    {
                        address: user.email,
                        verified: false,
                        provides: "default"
                    }
                ],
                groups: ["y4PTFE8LEFbsnEjkP"],
                name: null,
                profile: {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    dob: user.dob,
                    phone: user.username ? user.username : ""
                },
                shopId: null,
                state: "new",
                userId: userId,
                phoneNumber: user.phoneNumber
            };
            const accountAdded = await Accounts.insertOne(account);

            // console.log("addedd acount is ", accountAdded);
        }
        if (!accountsServer.options.enableAutologin) {
            return {
                userId: accountsServer.options.ambiguousErrorMessages ? null : userId,
            };
        }
        // When initializing AccountsServer we check that enableAutologin and ambiguousErrorMessages options
        // are not enabled at the same time
        const createdUser = await accountsServer.findUserById(userId);
        console.log("createdUser ", createdUser)
        // If we are here - user must be created successfully
        // Explicitly saying this to Typescript compiler
        const loginResult = await accountsServer.loginWithUser(createdUser, infos);
        console.log("loginResult ", loginResult)
        return {
            userId,
            loginResult,
        };
    },
    authenticate: async (_, args, ctx) => {
        console.log(args)
        const { serviceName, params } = args;
        const { injector, infos, collections } = ctx;
        const { users } = collections;
        console.log("authenticate");
        const authenticated = await injector
            .get(server_1.AccountsServer)
            .loginWithService(serviceName, params, infos);
        return authenticated;
    },

    changePassword: async (
        _,
        { oldPassword, newPassword },
        { user, injector }
    ) => {
        if (!(user && user.id)) {
            throw new Error("Unauthorized");
        }
        const userId = user.id;
        let responsePassword = await injector
            .get(password_1.AccountsPassword)
            .changePassword(userId, oldPassword, newPassword);
        console.log("change password response ", responsePassword);
        return null;
    },

    resetPassword: async (_, { token, newPassword }, { injector, infos }) => {
        return injector
            .get(password_1.AccountsPassword)
            .resetPassword(token, newPassword, infos);
    },

    sendResetPasswordEmail: async (_, { email }, { injector }) => {
        const accountsServer = injector.get(server_1.AccountsServer);
        const accountsPassword = injector.get(password_1.AccountsPassword);
        try {
            await accountsPassword.sendResetPasswordEmail(email);
        } catch (error) {
            // If ambiguousErrorMessages is true,
            // to prevent user enumeration we fail silently in case there is no user attached to this email
            if (
                accountsServer.options.ambiguousErrorMessages &&
                error instanceof server_1.AccountsJsError &&
                error.code === password_1.SendResetPasswordEmailErrors.UserNotFound
            ) {
                return null;
            }
            throw error;
        }
        return null;
    },
};

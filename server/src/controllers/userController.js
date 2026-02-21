import { User } from '../models/userModel.js';
import { ApiError } from '../utils/ApiError.js';
import { asynchandler } from '../utils/asynchandler.js';
import { ApiResponse } from '../utils/ApiResponse.js'
import { Organization } from '../models/organizationModel.js';
import { Membership } from '../models/membershipModel.js';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        if (!user) {
            throw new ApiError(404, "User not found for token generation")
        }

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Token generation failed")
    }
}



const googleAuthCallback = asynchandler(async (req, res) => {
    if (!req.user) {
        return res.redirect(`${process.env.CLIENT_URL}/auth?error=google_failed`);
    }

    const { accessToken, refreshToken } =
        await generateAccessAndRefreshToken(req.user._id);

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax", // IMPORTANT for localhost OAuth
        path: "/",
    };

    // set session cookies
    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    /*
      Now decide where user should land.
      Backend already knows onboarding status.
    */
    if (!req.user.isOnboarded) {
        return res.redirect(`${process.env.CLIENT_URL}/onboarding`);
    }

    return res.redirect(`${process.env.CLIENT_URL}/dashboard`);
});




const registerUser = asynchandler(async (req, res) => {
    const { email, fullName, password } = req.body || {}

    // validation
    if (!email || !fullName || !password) {
        throw new ApiError(400, "All fields are required")
    }

    // check existing
    const existingUser = await User.findOne({ email })
    if (existingUser) {
        throw new ApiError(400, "User with this email already exists")
    }

    // create user
    const newUser = await User.create({
        fullName,
        email,
        password
    })

    const createdUser = await User.findById(newUser._id).select("-password -refreshToken")
    if (!createdUser) {
        throw new ApiError(500, "User registration failed, please try again later")
    }

    // 🔴 IMPORTANT PART — CREATE LOGIN SESSION
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(newUser._id)

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    // send cookies + response
    return res
        .status(201)
        .cookie("accessToken", accessToken, {
            ...cookieOptions,
            maxAge: 24 * 60 * 60 * 1000,
        })
        .cookie("refreshToken", refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .json(
            new ApiResponse(
                201,
                { user: createdUser, accessToken, refreshToken },
                "User registered and logged in successfully"
            )
        )
})





const loginUser = asynchandler(async (req, res) => {

    const { email, password } = req.body || {}

    if (!req.body) {
        throw new ApiError(400, "Request body is missing or invalid")
    }

    // checking for blank fields
    if (!email || !password) {
        throw new ApiError(400, "Email or username and password are required")
    }

    //find user by email or username in database

    const user = await User.findOne({
        email
    })

    if (!user) {
        throw new ApiError(404, "User not found, please register first")

    }
    //verifying password

    const isPasswordCorrect = await user.isPasswordCorrect(password) //calling the method defined in user model to compare passwords

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Incorrect password, please try again")
    }

    //generating access and refresh tokens

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    //Now for sending response back to frontend we need to create a user object excluding password and refresh token

    const LoggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )


    return res.status(200)
        .cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 24 * 60 * 60 * 1000, //1 day in milliseconds
        })
        .cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60 * 1000, //7 days in milliseconds
        })
        .json(
            new ApiResponse(200,
                {
                    user: LoggedInUser, accessToken, refreshToken
                    //this user object is sent to frontend to show user details in frontend after login along with access and refresh tokens, this lets user to store these tokens in local storage or any other secure place in frontend for future requests if needed and stay logged in.

                }, "User logged in successfully"
            )
        )

})





const logoutUser = asynchandler(async (req, res) => {
    //deleting refresh tokens
    const userlogout = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined }
        },
        {
            new: true
        }
    )
    //deleting cookies also and returning response 
    return res.status(200)
        .clearCookie(
            "accessToken",
            {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production"
            })
        .clearCookie(
            "refreshToken",
            {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production"
            }
        )
        .json(new ApiResponse(201, {}, "User logged out succesfully"))

})




const refreshRefreshToken = asynchandler(async (req, res) => {

    const incomingRefreshTokenByUser = req.cookies?.refreshToken || req.header.refreshToken

    if (!incomingRefreshTokenByUser) {
        throw new ApiError(401, "Refresh token not found, unauthorized access")
    }

    //verifying refresh token using jwt verify method and decoding it

    const decodedToken = jwt.verify(incomingRefreshTokenByUser, process.env.REFRESH_TOKEN_SECRET)

    //finding user in database using decoded token which contain user id in payload as seen in user.js of model - it is already defined that refreshToken will have user id in payload

    const user = await User.findById(decodedToken._id)

    if (!user) {
        throw new ApiError(404, "User not found for provided refresh token")
    }

    //comparing incoming refresh token with the one stored in database for that user
    if (incomingRefreshTokenByUser !== user?.refreshToken) {
        throw new ApiError(401, "Invalid refresh token, unauthorized access")
    }

    //generating new access and refresh tokens

    const { accessToken, refreshToken: newrefreshToken } = await generateAccessAndRefreshToken(user._id)

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }
    //sending new tokens back to frontend in cookies and response
    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(
            new ApiResponse(200,
                {
                    user: user, accessToken, refreshToken: newrefreshToken
                }, "Access token refreshed successfully"
            )
        )
})



const changeUserPassword = asynchandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body || {}

    if (!req.body) {
        throw new ApiError(400, "Request body is missing or invalid")
    }

    const user = await User.findById(req.user._id)

    const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isOldPasswordCorrect) {
        throw new ApiError(401, "Old password is incorrect")
    }

    user.password = newPassword

    const updatedUserPswd = await user.save({ validateBeforeSave: true })

    if (!updatedUserPswd) {
        throw new ApiError(500, "Password update failed, please try again later")
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Password updated successfully")
    )

})

const getMe = asynchandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("-password -refreshToken")

    if (!user) {
        throw new ApiError(404, "User not found")
    }



    return res.status(200).json(
        new ApiResponse(200, user, "User details fetched successfully")
    )
})

const completeOnboarding = asynchandler(async (req, res) => {
    const { companyName } = req.body;

    if (!companyName || companyName.trim().length < 2) {
        throw new ApiError(400, "Company name must be at least 2 characters");
    }

    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }


    const org = await Organization.create({
        name: companyName,
        owner: req.user._id,
    });

    if(!org){
        throw new ApiError(500, "Organization creation failed, please try again later")
    }

    const membership = await Membership.create({
        userId: req.user._id,
        organizationId: org._id,
        role: "owner",
        status: "active",
    });

    if(!membership){
        throw new ApiError(500, "Membership creation failed, please try again later")
    }

    user.isOnboarded = true;

    await user.save();
    return res.status(200).json(
        new ApiResponse(200, { organization: org, membership }, "Onboarding completed")
    );
});

export { registerUser, loginUser, logoutUser, changeUserPassword, refreshRefreshToken, googleAuthCallback, getMe, completeOnboarding }
import React, { useState } from "react";
import { Card, Input, Button, Typography, message } from "antd";
import { loginUser, signupUser, resetPassword } from "../auth/AuthFunctions";

const { Title, Text } = Typography;

const AuthPage = ({ setAuthenticated }) => {
  const [mode, setMode] = useState("login"); // login | signup | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleAuth = async () => {
    if (!email || !password) {
      message.error("Enter email & password");
      return;
    }

    let result;

    if (mode === "login") {
      result = await loginUser(email, password);
    } else {
      result = await signupUser(email, password);
    }

    if (result.success) {
      message.success(mode === "login" ? "Login successful!" : "Account created!");
      localStorage.setItem("authUser", result.user.uid);
      setAuthenticated(true);
    } else {
      message.error(result.error);
    }
  };

  const handleReset = async () => {
    if (!email) return message.error("Enter your email");

    const result = await resetPassword(email);
    result.success
      ? message.success("Reset link sent to email")
      : message.error(result.error);
  };

  return (
    <div style={{ width: 380, margin: "80px auto" }}>
      <Card>
        <Title level={3} style={{ textAlign: "center" }}>
          {mode === "login" && "Login"}
          {mode === "signup" && "Create Account"}
          {mode === "reset" && "Reset Password"}
        </Title>

        <Input
          size="large"
          type="email"
          placeholder="Email"
          style={{ marginBottom: 12 }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {mode !== "reset" && (
          <Input.Password
            size="large"
            placeholder="Password"
            style={{ marginBottom: 12 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}

        {mode === "reset" ? (
          <Button type="primary" block size="large" onClick={handleReset}>
            Send Reset Link
          </Button>
        ) : (
          <Button type="primary" block size="large" onClick={handleAuth}>
            {mode === "login" ? "Login" : "Create Account"}
          </Button>
        )}

        <div style={{ marginTop: 20, textAlign: "center" }}>
          {mode !== "login" && (
            <Text onClick={() => setMode("login")} style={{ cursor: "pointer" }}>
              Already have an account? Login
            </Text>
          )}
          <br />

          {mode !== "signup" && (
            <Text onClick={() => setMode("signup")} style={{ cursor: "pointer" }}>
              Create new account
            </Text>
          )}
          <br />

          {mode !== "reset" && (
            <Text onClick={() => setMode("reset")} style={{ cursor: "pointer" }}>
              Forgot password?
            </Text>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AuthPage;

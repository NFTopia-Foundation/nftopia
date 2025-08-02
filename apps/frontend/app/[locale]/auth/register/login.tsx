// components/LoginBox.tsx
import Link from "next/link";

const LoginBox = () => {
  return (
    <div className="relative w-[400px] h-[200px] bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-2xl shadow-lg hover:w-[450px] hover:h-[500px] transition-all duration-500 ease-in-out">
      <div className="absolute inset-60 flex flex-col items-center justify-center rounded-lg bg-black bg-opacity-50 text-white z-1000 shadow-inner border-b-2 border-white border-opacity-80 transition-all duration-500 ease-in-out hover:inset-40">
        <div className="relative flex flex-col items-center justify-center gap-5 p-5">
          <h2 className="uppercase font-semibold tracking-widest">
            <i className="fa-solid fa-right-to-bracket text-pink-500 text-shadow-pink"></i>
            Login
            <i className="fa-solid fa-heart text-pink-500 text-shadow-pink"></i>
          </h2>
          <input
            type="text"
            placeholder="Username"
            className="w-full p-2.5 outline-none border-none text-white bg-black bg-opacity-10 border-2 border-white border-opacity-50 rounded-full"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-2.5 outline-none border-none text-white bg-black bg-opacity-10 border-2 border-white border-opacity-50 rounded-full"
          />
          <input
            type="submit"
            value="Sign in"
            className="w-full p-2.5 bg-cyan-500 border-none font-medium text-black cursor-pointer hover:shadow-lg hover:shadow-cyan-500 transition-all duration-500 ease-in-out"
          />
          <div className="flex justify-between w-full">
            <Link href="#" className="text-white">
              Forgot Password
            </Link>
            <Link href="#" className="text-pink-500 font-semibold">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginBox;

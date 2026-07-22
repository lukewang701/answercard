import { TeacherEntrance } from './TeacherEntrance';

export default function Home() {
  return (
    <div className="container min-h-screen flex flex-col justify-center items-center">
      <div className="card max-w-md w-full text-center animate-fade-in">
        <h1 className="text-primary mb-6">數位答案卡</h1>

        <div className="flex flex-col gap-4">
          <TeacherEntrance />
        </div>
      </div>
    </div>
  );
}

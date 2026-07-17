export type ProgramStackParamList = {
  Days: undefined;
  DayDetail: { dayId: string };
  ExercisePicker: {
    dayId: string;
    onSessionAdd?: (exerciseId: string, sets: number, reps: number, durSecs: number) => void;
    onPickAlternative?: (exerciseId: string) => void;
  };
  WorkoutSession: { dayId: string };
  ExerciseHistory: { exerciseId: string };
};

export type ProgressStackParamList = {
  WorkoutLog: undefined;
  ExerciseHistory: { exerciseId: string };
  LogEdit: { logId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  Stats: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  Feedback: undefined;
};

export type BodyStackParamList = {
  BodyMap: undefined;
};

export type RootTabParamList = {
  ProgramTab: undefined;
  ProgressTab: undefined;
  BodyTab: undefined;
  ProfileTab: undefined;
  SettingsTab: undefined;
};

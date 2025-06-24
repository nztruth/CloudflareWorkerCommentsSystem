import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import {
  Container,
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Anchor,
  Stack,
  Alert,
  Group,
  Center
} from '@mantine/core';
import { useForm } from 'react-hook-form';
import { apiClient } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { Head } from '../components/Head';

interface LoginForm {
  email: string;
  password: string;
  name?: string;
}

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const authMutation = useMutation(
    async (data: LoginForm) => {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const response = await apiClient.post(endpoint, data);
      return response.data;
    },
    {
      onSuccess: (data) => {
        login(data.token);
        navigate('/dashboard');
      },
      onError: (error: any) => {
        setError(error.response?.data?.error || 'Authentication failed');
      }
    }
  );

  const onSubmit = (data: LoginForm) => {
    setError('');
    authMutation.mutate(data);
  };

  return (
    <Container size={420} my={40}>
      <Head title={`${isRegister ? 'Sign Up' : 'Sign In'} - Cusdis`} />
      
      <Center>
        <Stack spacing="lg" style={{ width: '100%' }}>
          <Stack spacing="sm" align="center">
            <Title order={2}>Cusdis</Title>
            <Text color="dimmed" size="sm" align="center">
              {isRegister ? 'Create your account' : 'Welcome back'}
            </Text>
          </Stack>

          <Paper withBorder shadow="md" p={30} radius="md">
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing="md">
                {error && (
                  <Alert color="red" variant="light">
                    {error}
                  </Alert>
                )}

                {isRegister && (
                  <TextInput
                    label="Name"
                    placeholder="Your name"
                    {...register('name', { required: isRegister })}
                    error={errors.name?.message}
                  />
                )}

                <TextInput
                  label="Email"
                  placeholder="your@email.com"
                  type="email"
                  {...register('email', { required: 'Email is required' })}
                  error={errors.email?.message}
                />

                <PasswordInput
                  label="Password"
                  placeholder="Your password"
                  {...register('password', { required: 'Password is required' })}
                  error={errors.password?.message}
                />

                <Button
                  type="submit"
                  fullWidth
                  loading={authMutation.isLoading}
                >
                  {isRegister ? 'Sign up' : 'Sign in'}
                </Button>
              </Stack>
            </form>
          </Paper>

          <Text color="dimmed" size="sm" align="center">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <Anchor
              size="sm"
              component="button"
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
            >
              {isRegister ? 'Sign in' : 'Create account'}
            </Anchor>
          </Text>

          <Stack spacing="sm" align="center" mt="lg">
            <Text size="sm" weight={500} color="dimmed">
              Why Cusdis?
            </Text>
            <Stack spacing="xs">
              <Text size="xs" color="dimmed">• Lightweight (~5kb) and fast</Text>
              <Text size="xs" color="dimmed">• Privacy-friendly, no tracking</Text>
              <Text size="xs" color="dimmed">• Easy to embed and customize</Text>
              <Text size="xs" color="dimmed">• Built-in moderation tools</Text>
            </Stack>
          </Stack>
        </Stack>
      </Center>
    </Container>
  );
}

export default LoginPage;
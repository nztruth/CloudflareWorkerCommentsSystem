import React from 'react';
import { Container, Group, Anchor, Text } from '@mantine/core';

export function Footer() {
  return (
    <Container>
      <Group position="apart" py="md">
        <Text size="sm" color="dimmed">
          © 2024 Cusdis. Open source comment system.
        </Text>
        <Group spacing="md">
          <Anchor href="https://github.com/djyde/cusdis" target="_blank" size="sm">
            GitHub
          </Anchor>
          <Anchor href="/doc" size="sm">
            Documentation
          </Anchor>
          <Anchor href="/privacy-policy" size="sm">
            Privacy
          </Anchor>
        </Group>
      </Group>
    </Container>
  );
}
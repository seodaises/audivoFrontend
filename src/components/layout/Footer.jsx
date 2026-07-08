import { Box, Container, Typography, Stack, Link } from '@mui/material';

export default function Footer() {
  return (
    <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', mt: 'auto', py: 4 }}>
      <Container maxWidth="lg">
        <Stack direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Audivo. Hear More, Feel More.
          </Typography>
          <Stack direction="row" spacing={5}>
            <Link href="#" underline="hover" color="text.secondary" variant="body2">About</Link>
            <Link href="#" underline="hover" color="text.secondary" variant="body2">Privacy</Link>
            <Link href="#" underline="hover" color="text.secondary" variant="body2">Contact</Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
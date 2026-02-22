# Charge Alerts Pi Config

Sets up a Pi5 as a Noisebridge charge alerts kiosk display driver.

## Prerequisites

- Ansible installed on your local machine
- Pi 5+ running Raspberry Pi OS Lite (64 bit)
- SSH access to the target Pi as user `noisebridge`
- The following public key must be added to `/home/noisebridge/.ssh/authorized_keys` on the Pi:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGtWmsOI4jOl8Tjs3jb8qJRWzBEj8JBnM0bLohjblbx8 charge-alerts-ansible
```

## Usage

Provision a host:

```bash
cd ansible
ansible-playbook provision.yml --ask-vault-pass --limit charge-alerts2
```

Dry run (check mode):

```bash
cd ansible
ansible-playbook provision.yml --ask-vault-pass --limit charge-alerts2 --check --diff
```

## Adding a new host

Add an entry to `ansible/inventory.yml`:

```yaml
all:
  children:
    kiosks:
      hosts:
        # ...
        charge-alertsN:
          ansible_host: charge-alertsN.local
```

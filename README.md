# Alert Kiosk Pi Provisioning

Sets up Raspberry Pis for kiosk displays within Noisebridge.

## Prerequisites

- Ansible installed on your local machine
- Pi running Raspberry Pi OS Lite (64 bit)
- SSH access to the target Pi as user `noisebridge`
- The associated public key must be added to `/home/noisebridge/.ssh/authorized_keys` on the Pi:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGtWmsOI4jOl8Tjs3jb8qJRWzBEj8JBnM0bLohjblbx8 charge-alerts-ansible
```

or

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAID8IthOimS7LvN3ckAXcYunJ8CoLFAbEqEeTTfQQQaMq membership-alerts-ansible
```

## Usage

Provision a charge-alerts host:

```bash
cd ansible
ansible-playbook charge-provision.yml --ask-vault-pass --limit charge-alerts2
```

Provision a membership-alerts host:

```bash
cd ansible
ansible-playbook membership-provision.yml --ask-vault-pass
```

Dry run (check mode):

```bash
cd ansible
ansible-playbook charge-provision.yml --ask-vault-pass --limit charge-alerts2 --check --diff
```

## Adding a new charge-alerts host

Add an entry to `ansible/inventory.yml`:

```yaml
all:
  children:
    charge_kiosks:
      hosts:
        # ...
        charge-alertsN:
          ansible_host: charge-alertsN.local
          ansible_ssh_private_key_file: ~/.ssh/charge-alerts
```
